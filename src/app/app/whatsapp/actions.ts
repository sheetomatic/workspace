"use server";

import { revalidatePath } from "next/cache";
import { redlavaPortalBrandName } from "@/lib/integrations/redlava-portal";
import { canUsePlatformWhatsAppEnv } from "@/lib/platform";

const PORTAL_BRAND = redlavaPortalBrandName();
import type { WhatsAppTemplateCategory, WhatsAppProvider } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasMinimumRole } from "@/lib/permissions";
import {
  listRemoteWhatsAppTemplates,
  submitWhatsAppTemplateForApproval,
  getWhatsAppTemplateSetup,
} from "@/lib/integrations/whatsapp-templates";
import {
  extractTemplateVariables,
  normalizeTemplateName,
  mapRemoteTemplateStatus,
  type WhatsAppTemplateVariable,
} from "@/lib/whatsapp-templates";
import { normalizeWhatsAppPhone } from "@/lib/phone";
import { resolveWorkspaceWhatsAppCredentials } from "@/lib/whatsapp-settings";
import {
  formatWhatsAppTestPhoneLabel,
  resolveWhatsAppTestPhone,
} from "@/lib/whatsapp-test-phone";
import { syncWhatsAppTestPhoneForUser } from "@/lib/whatsapp-test-phone-sync";
import { parseWhatsAppProviderField } from "@/lib/whatsapp-settings-form";
import type { WhatsAppTemplateActionState } from "@/lib/whatsapp-template-types";

function parseVariables(formData: FormData) {
  const names = formData.getAll("variableName").map((value) => value.toString());
  const examples = formData
    .getAll("variableExample")
    .map((value) => value.toString());

  const variables: WhatsAppTemplateVariable[] = [];
  for (let index = 0; index < names.length; index += 1) {
    const name = names[index]?.trim();
    const example = examples[index]?.trim() ?? "";
    if (!name) {
      continue;
    }
    variables.push({ name, example });
  }
  return variables;
}

export async function submitWhatsAppTemplate(
  _prev: WhatsAppTemplateActionState,
  formData: FormData,
): Promise<WhatsAppTemplateActionState> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "You cannot submit WhatsApp templates." };
  }

  const rawName = formData.get("name")?.toString() ?? "";
  const name = normalizeTemplateName(rawName);
  const category = formData.get("category")?.toString() as WhatsAppTemplateCategory;
  const language = formData.get("language")?.toString().trim() || "en";
  const body = formData.get("body")?.toString().trim() ?? "";
  const variables = parseVariables(formData);

  if (!name || name.length < 3) {
    return {
      ok: false,
      message: "Template name must be at least 3 characters (letters, numbers, underscore).",
    };
  }

  if (!["MARKETING", "UTILITY", "AUTHENTICATION"].includes(category)) {
    return { ok: false, message: "Choose a valid template category." };
  }

  if (body.length < 10) {
    return { ok: false, message: "Template body must be at least 10 characters." };
  }

  const referenced = extractTemplateVariables(body);
  const provided = new Set(variables.map((variable) => variable.name));
  const missingExamples = referenced.filter((variable) => !provided.has(variable));
  if (missingExamples.length > 0) {
    return {
      ok: false,
      message: `Add example values for ${missingExamples.map((item) => `{{${item}}}`).join(", ")}.`,
    };
  }

  const existing = await prisma.whatsAppTemplate.findUnique({
    where: {
      organizationId_name_language: {
        organizationId: user.organizationId,
        name,
        language,
      },
    },
  });

  if (existing) {
    return {
      ok: false,
      message: "A template with this name and language already exists.",
    };
  }

  const credentials = await resolveWorkspaceWhatsAppCredentials(user.organizationId);
  const redlava = {
    apiKey: credentials.redlavaApiKey,
    phoneId: credentials.redlavaPhoneId,
  };

  const submission = await submitWhatsAppTemplateForApproval(
    {
      name,
      category,
      language,
      body,
      variables,
    },
    redlava,
  );

  if (!submission.ok) {
    return { ok: false, message: submission.message };
  }

  await prisma.whatsAppTemplate.create({
    data: {
      organizationId: user.organizationId,
      name,
      category,
      language,
      body,
      variables,
      status: submission.status,
      externalId: submission.externalId,
      createdById: user.id,
      approvedAt: submission.status === "APPROVED" ? new Date() : null,
    },
  });

  revalidatePath("/ai/app/channels");
  revalidatePath("/app/whatsapp");
  return {
    ok: true,
    message: submission.detail,
  };
}

function parseRemoteCategory(category?: string): WhatsAppTemplateCategory {
  const normalized = category?.toUpperCase();
  if (
    normalized === "MARKETING" ||
    normalized === "UTILITY" ||
    normalized === "AUTHENTICATION"
  ) {
    return normalized;
  }
  return "UTILITY";
}

function extractRemoteTemplateBody(
  template: Awaited<
    ReturnType<typeof listRemoteWhatsAppTemplates>
  >["templates"][number],
) {
  const bodyComponent = template.components?.find(
    (component) => component.type?.toUpperCase() === "BODY",
  );
  return bodyComponent?.text?.trim() ?? "";
}

async function upsertRemoteTemplate(
  organizationId: string,
  userId: string,
  template: Awaited<
    ReturnType<typeof listRemoteWhatsAppTemplates>
  >["templates"][number],
  options?: { approvedOnly?: boolean },
) {
  const mappedStatus = mapRemoteTemplateStatus(template.status);
  if (options?.approvedOnly && mappedStatus !== "APPROVED") {
    return false;
  }

  const body = extractRemoteTemplateBody(template);
  if (!body) {
    return false;
  }

  const language = template.language ?? "en";
  const category = parseRemoteCategory(template.category);

  await prisma.whatsAppTemplate.upsert({
    where: {
      organizationId_name_language: {
        organizationId,
        name: template.name,
        language,
      },
    },
    update: {
      status: mappedStatus,
      body,
      category,
      externalId: template.id ?? undefined,
      approvedAt: mappedStatus === "APPROVED" ? new Date() : null,
      rejectionReason: template.rejectionReason ?? null,
    },
    create: {
      organizationId,
      name: template.name,
      category,
      language,
      body,
      variables: [],
      status: mappedStatus,
      externalId: template.id ?? null,
      createdById: userId,
      approvedAt: mappedStatus === "APPROVED" ? new Date() : null,
      rejectionReason: template.rejectionReason ?? null,
    },
  });

  return true;
}

export async function syncWhatsAppTemplates(): Promise<WhatsAppTemplateActionState> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "You cannot sync WhatsApp templates." };
  }

  const credentials = await resolveWorkspaceWhatsAppCredentials(user.organizationId);
  const redlava = {
    apiKey: credentials.redlavaApiKey,
    phoneId: credentials.redlavaPhoneId,
  };

  const remote = await listRemoteWhatsAppTemplates(redlava);
  if (!remote.ok) {
    return { ok: false, message: remote.message };
  }

  if (remote.templates.length === 0) {
    return {
      ok: true,
      message:
        `No templates found in ${PORTAL_BRAND}. Create templates in your WhatsApp portal dashboard first.`,
    };
  }

  let synced = 0;
  for (const template of remote.templates) {
    const saved = await upsertRemoteTemplate(
      user.organizationId,
      user.id,
      template,
    );
    if (saved) {
      synced += 1;
    }
  }

  revalidatePath("/ai/app/channels");
  revalidatePath("/app/whatsapp");
  const approved = remote.templates.filter(
    (template) => mapRemoteTemplateStatus(template.status) === "APPROVED",
  ).length;

  return {
    ok: true,
    message: `Synced ${synced} template${synced === 1 ? "" : "s"} from ${PORTAL_BRAND} (${approved} approved).`,
  };
}

export async function importApprovedWhatsAppTemplates(): Promise<WhatsAppTemplateActionState> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "You cannot import WhatsApp templates." };
  }

  const credentials = await resolveWorkspaceWhatsAppCredentials(user.organizationId);
  const redlava = {
    apiKey: credentials.redlavaApiKey,
    phoneId: credentials.redlavaPhoneId,
  };

  const remote = await listRemoteWhatsAppTemplates(redlava);
  if (!remote.ok) {
    return { ok: false, message: remote.message };
  }

  let imported = 0;
  for (const template of remote.templates) {
    const saved = await upsertRemoteTemplate(
      user.organizationId,
      user.id,
      template,
      { approvedOnly: true },
    );
    if (saved) {
      imported += 1;
    }
  }

  revalidatePath("/ai/app/channels");
  revalidatePath("/app/whatsapp");
  return {
    ok: true,
    message:
      imported > 0
        ? `Imported ${imported} approved template${imported === 1 ? "" : "s"}.`
        : "No new approved templates found to import.",
  };
}

function pickSecretField(next: string, existing: string | null | undefined) {
  const trimmed = next.trim();
  if (!trimmed) {
    return existing ?? null;
  }
  return trimmed;
}

export async function saveWhatsAppSettings(
  _prev: WhatsAppTemplateActionState,
  formData: FormData,
): Promise<WhatsAppTemplateActionState> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Only admins can update WhatsApp settings." };
  }

  const existing = await prisma.workspaceWhatsAppSettings.findUnique({
    where: { organizationId: user.organizationId },
  });

  const businessRaw = formData.get("businessPhone")?.toString() ?? "";
  const businessPhone = normalizeWhatsAppPhone(businessRaw);

  if (businessRaw.trim() && !businessPhone) {
    return { ok: false, message: "Business WhatsApp number must be at least 10 digits." };
  }

  const providerKind = parseWhatsAppProviderField(formData.get("whatsappProvider"));
  const whatsappProvider: WhatsAppProvider =
    providerKind === "messageautosender" ? "MESSAGEAUTOSENDER" : "SHEETOMATIC";

  const masUsername =
    formData.get("masUsername")?.toString().trim() ||
    existing?.masUsername ||
    null;
  const masPassword = pickSecretField(
    formData.get("masPassword")?.toString() ?? "",
    existing?.masPassword,
  );
  const masApiKey = pickSecretField(
    formData.get("masApiKey")?.toString() ?? "",
    existing?.masApiKey,
  );

  const usePlatformEnv = await canUsePlatformWhatsAppEnv(user.organizationId);
  const envPhoneId = usePlatformEnv
    ? process.env.REDLAVA_PHONE_ID?.trim() || null
    : null;

  const nextPhoneId =
    formData.get("redlavaPhoneId")?.toString().trim() ||
    existing?.redlavaPhoneId ||
    envPhoneId ||
    null;

  if (whatsappProvider === "MESSAGEAUTOSENDER") {
    if (!masUsername || !masPassword || !masApiKey) {
      return {
        ok: false,
        message: "Username, password, and API key are required for Web Based API.",
      };
    }
  } else {
    const nextApiKey = pickSecretField(
      formData.get("redlavaApiKey")?.toString() ?? "",
      existing?.redlavaApiKey,
    );
    if (!nextApiKey || !nextPhoneId) {
      return {
        ok: false,
        message: "API key and Phone ID are required for WhatsApp API.",
      };
    }
  }

  if (whatsappProvider === "SHEETOMATIC" && nextPhoneId) {
    const duplicate = await prisma.workspaceWhatsAppSettings.findFirst({
      where: {
        redlavaPhoneId: nextPhoneId,
        organizationId: { not: user.organizationId },
      },
      select: { organization: { select: { name: true, slug: true } } },
    });
    if (duplicate) {
      return {
        ok: false,
        message: `This Phone ID is already linked to ${duplicate.organization.name}. Each workspace needs its own Meta Phone Number ID.`,
      };
    }
  }

  await prisma.workspaceWhatsAppSettings.upsert({
    where: { organizationId: user.organizationId },
    create: {
      organizationId: user.organizationId,
      businessPhone,
      whatsappProvider,
      redlavaApiKey: pickSecretField(
        formData.get("redlavaApiKey")?.toString() ?? "",
        null,
      ),
      redlavaPhoneId: nextPhoneId,
      masUsername,
      masPassword,
      masApiKey,
    },
    update: {
      businessPhone,
      whatsappProvider,
      redlavaApiKey: pickSecretField(
        formData.get("redlavaApiKey")?.toString() ?? "",
        existing?.redlavaApiKey,
      ),
      redlavaPhoneId: nextPhoneId,
      masUsername,
      masPassword,
      masApiKey,
    },
  });

  revalidatePath("/ai/app/channels");
  revalidatePath("/ai/app/campaign");
  revalidatePath("/ai/app/settings");
  revalidatePath("/ai/app");
  revalidatePath("/app/whatsapp");
  return { ok: true, message: "WhatsApp settings saved." };
}

export async function updateMemberWhatsAppPhone(
  _prev: WhatsAppTemplateActionState,
  formData: FormData,
): Promise<WhatsAppTemplateActionState> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Only admins can update member numbers." };
  }

  const membershipId = formData.get("membershipId")?.toString() ?? "";
  const whatsappRaw = formData.get("whatsapp")?.toString() ?? "";
  const phone = normalizeWhatsAppPhone(whatsappRaw);

  if (!membershipId) {
    return { ok: false, message: "Member not found." };
  }

  if (!whatsappRaw.trim()) {
    return { ok: false, message: "Enter a WhatsApp number." };
  }

  if (!phone) {
    return {
      ok: false,
      message: "WhatsApp number must be at least 10 digits (e.g. 9685788980).",
    };
  }

  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, organizationId: user.organizationId },
    include: { user: true },
  });

  if (!membership) {
    return { ok: false, message: "Member not found." };
  }

  await prisma.user.update({
    where: { id: membership.userId },
    data: { phone },
  });

  revalidatePath("/ai/app/channels");
  revalidatePath("/ai/app/campaign");
  revalidatePath("/ai/app/settings");
  revalidatePath("/ai/app");
  revalidatePath("/app/whatsapp");
  revalidatePath("/app/team");
  return {
    ok: true,
    message: `WhatsApp number added for ${membership.user.name ?? membership.user.email}.`,
  };
}

export async function getWhatsAppPageSetup() {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return {
      hasApiKey: false,
      phoneId: null as string | null,
      canSend: false,
      canManageTemplates: false,
      setupHint: "Admin access required to manage WhatsApp.",
    };
  }

  const credentials = await resolveWorkspaceWhatsAppCredentials(
    user.organizationId,
  );
  const setup = getWhatsAppTemplateSetup(
    {
      apiKey: credentials.redlavaApiKey,
      phoneId: credentials.redlavaPhoneId,
    },
    {
      provider: credentials.whatsappProvider,
      masCredentials: {
        username: credentials.masUsername,
        password: credentials.masPassword,
        apiKey: credentials.masApiKey,
      },
    },
  );

  return {
    hasApiKey: Boolean(credentials.redlavaApiKey),
    phoneId: credentials.redlavaPhoneId,
    canSend: setup.canSend,
    canManageTemplates: setup.canManageTemplates,
    setupHint: setup.setupHint,
  };
}

export async function toggleWhatsAppBotLive(
  enable: boolean,
): Promise<WhatsAppTemplateActionState> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Only admins can change Go Live status." };
  }

  if (enable) {
    const { getWhatsAppGoLiveStatus } = await import("@/lib/whatsapp-go-live");
    const status = await getWhatsAppGoLiveStatus(user.organizationId);
    if (!status.canGoLive) {
      return {
        ok: false,
        message: status.blockers[0] ?? "Complete setup before going live.",
      };
    }
  }

  await prisma.workspaceWhatsAppSettings.upsert({
    where: { organizationId: user.organizationId },
    create: {
      organizationId: user.organizationId,
      botLiveAt: enable ? new Date() : null,
    },
    update: {
      botLiveAt: enable ? new Date() : null,
    },
  });

  revalidatePath("/ai/app/channels");
  revalidatePath("/ai/app");
  revalidatePath("/app/whatsapp");

  return {
    ok: true,
    message: enable
      ? "Sheetomatic AI is live on WhatsApp. Send hi to your business number to test."
      : "WhatsApp AI paused. Inbound messages will not run automations.",
  };
}

export async function sendWhatsAppConnectionTest(): Promise<WhatsAppTemplateActionState> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Only admins can run connection tests." };
  }

  const credentials = await resolveWorkspaceWhatsAppCredentials(user.organizationId);
  const { whatsAppPhonesEqual, formatWhatsAppPhone } = await import("@/lib/phone");

  const testPhone = resolveWhatsAppTestPhone();
  if (!testPhone) {
    return {
      ok: false,
      message: "Test WhatsApp number is not configured.",
    };
  }

  if (
    credentials.businessPhone &&
    whatsAppPhonesEqual(testPhone, credentials.businessPhone)
  ) {
    const businessFormatted = formatWhatsAppPhone(credentials.businessPhone);
    return {
      ok: false,
      message: [
        "The test WhatsApp number is the same as the business line",
        businessFormatted ? `(${businessFormatted})` : "",
        "- Meta cannot deliver API messages to your own business number.",
        "",
        "Set WHATSAPP_TEST_PHONE to a personal mobile number on Vercel.",
      ]
        .filter(Boolean)
        .join(" "),
    };
  }

  const tester = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true },
  });

  const { sendWhatsAppText } = await import("@/lib/whatsapp-bot/send");
  const { formatWhatsAppSendFailureMessage } = await import(
    "@/lib/integrations/redlava"
  );
  const result = await sendWhatsAppText({
    organizationId: user.organizationId,
    toPhone: testPhone,
    body: [
      "Sheetomatic WhatsApp connection test",
      "",
      `Hi ${tester?.name?.split(/\s+/)[0] ?? "there"}! Outbound WhatsApp is working.`,
      "",
      "Now open the Sheetomatic Technologies chat and reply *Hi* to test inbound.",
      "You should get the task menu within a few seconds.",
    ].join("\n"),
  });

  if (!result.sent) {
    return {
      ok: false,
      message: formatWhatsAppSendFailureMessage(result.detail, "text"),
    };
  }

  await syncWhatsAppTestPhoneForUser(
    user.organizationId,
    user.id,
    user.role,
  );

  return {
    ok: true,
    message: `Test message sent to ${formatWhatsAppTestPhoneLabel()}. Check that phone.`,
    messageId: result.messageId,
  };
}
