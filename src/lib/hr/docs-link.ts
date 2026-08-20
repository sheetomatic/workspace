import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { getLoginBaseUrl } from "@/lib/integrations/email-base-url";
import { sendPlainEmail } from "@/lib/integrations/email";
import { normalizeWhatsAppPhone } from "@/lib/phone";
import { sendWhatsAppText } from "@/lib/whatsapp-bot/send";
import {
  getOnboardingChecklist,
  setOnboardingPending,
} from "@/lib/hr/onboarding";

export const EMPLOYEE_DOCS_LINK_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export type EmployeeDocsLinkPayload = {
  p: string;
  o: string;
  e: number;
};

function signingSecret() {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "sheetomatic-hr-docs-dev"
  );
}

function sign(body: string) {
  return createHmac("sha256", signingSecret()).update(body).digest("base64url");
}

export function createEmployeeDocsToken(
  employeeProfileId: string,
  organizationId: string,
  now = Date.now(),
) {
  const payload: EmployeeDocsLinkPayload = {
    p: employeeProfileId,
    o: organizationId,
    e: now + EMPLOYEE_DOCS_LINK_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyEmployeeDocsToken(
  raw: string | undefined | null,
  now = Date.now(),
): EmployeeDocsLinkPayload | null {
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as EmployeeDocsLinkPayload;
    if (!parsed.p || !parsed.o || !parsed.e || parsed.e < now) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function buildEmployeeDocsPublicUrl(token: string) {
  return `${getLoginBaseUrl()}/hr/docs/${encodeURIComponent(token)}`;
}

export function buildWhatsAppMeUrl(phone: string, text: string) {
  const to = normalizeWhatsAppPhone(phone);
  if (!to) return null;
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

export function employeeDocsRequestCopy(params: {
  employeeName: string;
  organizationName: string;
  url: string;
  missingLabels: string[];
}) {
  const missing =
    params.missingLabels.length > 0
      ? params.missingLabels.join(", ")
      : "the remaining joining documents";
  const text = [
    `Hello ${params.employeeName},`,
    ``,
    `${params.organizationName} needs you to upload pending HR documents (${missing}).`,
    ``,
    `Open this link, save as draft if you need more time, then submit when all files are ready:`,
    params.url,
    ``,
    `The link is valid for 14 days. Do not share it.`,
    ``,
    `— ${params.organizationName} via Sheetomatic`,
  ].join("\n");

  return {
    subject: `[${params.organizationName}] Upload your pending HR documents`,
    text,
  };
}

export async function getEmployeeDocsLinkContext(token: string) {
  const payload = verifyEmployeeDocsToken(token);
  if (!payload) return null;

  const profile = await prisma.employeeProfile.findFirst({
    where: { id: payload.p, organizationId: payload.o },
    select: {
      id: true,
      organizationId: true,
      userId: true,
      employeeCode: true,
      status: true,
      onboardingStatus: true,
      educationSummary: true,
      experienceSummary: true,
      organization: { select: { name: true } },
      user: { select: { name: true, email: true } },
    },
  });
  if (!profile || profile.status === "EXITED") {
    return null;
  }

  const checklist = await getOnboardingChecklist({
    organizationId: profile.organizationId,
    employeeProfileId: profile.id,
  });

  return { payload, profile, checklist };
}

export async function sendEmployeeDocsLink(params: {
  organizationId: string;
  employeeProfileId: string;
  channel: "email" | "whatsapp";
}): Promise<{
  sent: boolean;
  message: string;
  url: string;
  waMeUrl?: string;
}> {
  const profile = await prisma.employeeProfile.findFirst({
    where: {
      id: params.employeeProfileId,
      organizationId: params.organizationId,
    },
    select: {
      id: true,
      phone: true,
      user: { select: { name: true, email: true, phone: true } },
      organization: { select: { name: true } },
    },
  });
  if (!profile) {
    throw new Error("Employee profile not found.");
  }

  await setOnboardingPending({
    organizationId: params.organizationId,
    employeeProfileId: profile.id,
  });

  const checklist = await getOnboardingChecklist({
    organizationId: params.organizationId,
    employeeProfileId: profile.id,
  });
  const missingLabels = checklist.items
    .filter((item) => !item.uploaded)
    .map((item) => item.label);

  const token = createEmployeeDocsToken(profile.id, params.organizationId);
  const url = buildEmployeeDocsPublicUrl(token);
  const copy = employeeDocsRequestCopy({
    employeeName: profile.user.name?.trim() || profile.user.email,
    organizationName: profile.organization.name,
    url,
    missingLabels,
  });

  if (params.channel === "email") {
    const result = await sendPlainEmail({
      toEmail: profile.user.email,
      subject: copy.subject,
      text: copy.text,
    });
    if (result.sent) {
      return {
        sent: true,
        message: `Document update link emailed to ${profile.user.email}.`,
        url,
      };
    }
    if (result.reason === "not_configured") {
      return {
        sent: false,
        message: `Email is not configured. Copy this link and send it to ${profile.user.email}: ${url}`,
        url,
      };
    }
    return {
      sent: false,
      message: `Could not send email. Copy this link: ${url}`,
      url,
    };
  }

  const phone = profile.phone?.trim() || profile.user.phone?.trim() || "";
  const waMeUrl = phone ? buildWhatsAppMeUrl(phone, copy.text) ?? undefined : undefined;
  if (!phone) {
    throw new Error(
      "Add a WhatsApp number on the employee profile before sending this link.",
    );
  }

  const wa = await sendWhatsAppText({
    organizationId: params.organizationId,
    toPhone: phone,
    body: copy.text,
  });
  if (wa.sent) {
    return {
      sent: true,
      message: "Document update link sent on WhatsApp.",
      url,
      waMeUrl,
    };
  }

  return {
    sent: false,
    message: waMeUrl
      ? "Official WhatsApp is not available. Opening WhatsApp with the same message."
      : `Could not send WhatsApp. Copy this link: ${url}`,
    url,
    waMeUrl,
  };
}
