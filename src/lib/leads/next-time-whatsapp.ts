import "server-only";

import { prisma } from "@/lib/db";
import { logInboundLeadActivity } from "@/lib/leads/activity";
import {
  buildLeadAiReengageMessage,
  NEXT_TIME_WA_TEMPLATE_LANGUAGE,
  NEXT_TIME_WA_TEMPLATE_NAME,
  nextTimeWhatsAppTemplateVariables,
} from "@/lib/leads/ai-reengage-message";
import { leadHasRequiredContact } from "@/lib/leads/contact-validation";
import { NEXT_TIME_LEAD_STATUSES } from "@/lib/leads/status-labels";
import {
  isApprovedOfficialTemplate,
  listOfficialApprovedTemplates,
  sendOfficialTemplateMessage,
} from "@/lib/integrations/sheetomatic-official-wa";
import { resolveWorkspaceWhatsAppCredentials } from "@/lib/whatsapp-settings";
import { hasActiveWhatsAppSession } from "@/lib/whatsapp-session";
import { sendWhatsAppText } from "@/lib/whatsapp-bot/send";

export {
  NEXT_TIME_WA_TEMPLATE_LANGUAGE,
  NEXT_TIME_WA_TEMPLATE_NAME,
} from "@/lib/leads/ai-reengage-message";

export const NEXT_TIME_WA_TEMPLATE_APPROVAL_HINT = `Approve MARKETING template ${NEXT_TIME_WA_TEMPLATE_NAME} (${NEXT_TIME_WA_TEMPLATE_LANGUAGE}) in WhatsApp Manager, then send again. Official API only — not MAS.`;

export type NextTimeWhatsAppSendResult = {
  ok: boolean;
  message: string;
  mode?: "session" | "template";
};

function officialCredentials(
  credentials: Awaited<ReturnType<typeof resolveWorkspaceWhatsAppCredentials>>,
) {
  const apiKey = credentials.redlavaApiKey?.trim() || null;
  if (!apiKey) {
    return null;
  }
  return {
    apiKey,
    phoneId: credentials.redlavaPhoneId?.trim() || null,
  };
}

export async function sendNextTimeLeadWhatsApp(params: {
  organizationId: string;
  leadId: string;
  actorUserId?: string | null;
}): Promise<NextTimeWhatsAppSendResult> {
  const lead = await prisma.inboundLead.findFirst({
    where: {
      id: params.leadId,
      organizationId: params.organizationId,
    },
    select: {
      id: true,
      phone: true,
      name: true,
      requirement: true,
      category: true,
      company: true,
      campaign: true,
      utmCampaign: true,
      utmContent: true,
      landingPage: true,
      channel: true,
      status: true,
    },
  });

  if (!lead) {
    return { ok: false, message: "Lead not found." };
  }

  if (!NEXT_TIME_LEAD_STATUSES.includes(lead.status)) {
    return {
      ok: false,
      message: "This WhatsApp follow-up is only for Next Time leads.",
    };
  }

  if (!leadHasRequiredContact(lead.phone)) {
    return { ok: false, message: "This lead has no WhatsApp number." };
  }

  const credentials = await resolveWorkspaceWhatsAppCredentials(
    params.organizationId,
  );
  const official = officialCredentials(credentials);
  if (!official) {
    return {
      ok: false,
      message:
        "Official API key is not set for this workspace. Add it in WhatsApp Settings.",
    };
  }

  const body = buildLeadAiReengageMessage(lead);
  const inSession = await hasActiveWhatsAppSession(
    params.organizationId,
    lead.phone!,
  );

  if (inSession) {
    const sessionSend = await sendWhatsAppText({
      organizationId: params.organizationId,
      toPhone: lead.phone!,
      body,
    });
    if (sessionSend.sent) {
      await logInboundLeadActivity({
        organizationId: params.organizationId,
        leadId: lead.id,
        type: "WHATSAPP",
        body: `[Next Time] ${body.slice(0, 200)}${body.length > 200 ? "…" : ""}`,
        metadata: {
          nextTimeFollowUp: true,
          channel: "OFFICIAL_API",
          mode: "session",
        },
        createdByUserId: params.actorUserId ?? null,
      });
      return {
        ok: true,
        message: "Next Time follow-up sent on WhatsApp.",
        mode: "session",
      };
    }
    if (sessionSend.reason !== "session_required") {
      return {
        ok: false,
        message: sessionSend.detail || "Could not send WhatsApp message.",
      };
    }
  }

  const listed = await listOfficialApprovedTemplates(official);
  if (!listed.ok) {
    return {
      ok: false,
      message: listed.error || NEXT_TIME_WA_TEMPLATE_APPROVAL_HINT,
    };
  }

  const approved = listed.templates.filter(
    (template) =>
      isApprovedOfficialTemplate(template) &&
      template.name === NEXT_TIME_WA_TEMPLATE_NAME,
  );
  const template =
    approved.find((row) =>
      row.language.toLowerCase().startsWith(NEXT_TIME_WA_TEMPLATE_LANGUAGE),
    ) ?? approved[0];

  if (!template) {
    return { ok: false, message: NEXT_TIME_WA_TEMPLATE_APPROVAL_HINT };
  }

  const send = await sendOfficialTemplateMessage(
    {
      toPhone: lead.phone!,
      templateName: template.name,
      language: template.language || NEXT_TIME_WA_TEMPLATE_LANGUAGE,
      templateVariables: nextTimeWhatsAppTemplateVariables(lead),
      userMessageId: `next_time_${lead.id}`,
    },
    official,
  );

  if (!send.ok) {
    if (send.insufficientBalance) {
      return { ok: false, message: send.error || "Insufficient Balance." };
    }
    if (send.marketingEngagementBlock) {
      return {
        ok: false,
        message:
          send.error ||
          "Meta blocked this marketing send (131049). The number may need to message you first.",
      };
    }
    return {
      ok: false,
      message: send.error || NEXT_TIME_WA_TEMPLATE_APPROVAL_HINT,
    };
  }

  await logInboundLeadActivity({
    organizationId: params.organizationId,
    leadId: lead.id,
    type: "WHATSAPP",
    body: `[Next Time] ${body.slice(0, 200)}${body.length > 200 ? "…" : ""}`,
    metadata: {
      nextTimeFollowUp: true,
      channel: "OFFICIAL_API",
      mode: "template",
      templateName: template.name,
    },
    createdByUserId: params.actorUserId ?? null,
  });

  return {
    ok: true,
    message: "Next Time follow-up sent on WhatsApp.",
    mode: "template",
  };
}
