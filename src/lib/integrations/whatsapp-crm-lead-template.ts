import { normalizeWhatsAppPhone } from "@/lib/phone";
import { resolveWorkspaceWhatsAppCredentials } from "@/lib/whatsapp-settings";
import {
  ASSIGN_CRM_LEAD_TEMPLATE_LANGUAGE,
  ASSIGN_CRM_LEAD_TEMPLATE_NAME,
  enforceRedlavaTemplateLanguage,
  isRedlavaConfigured,
  parseWhatsAppSendResponse,
  sendRedlavaTemplateMessage,
  type RedlavaCredentials,
  type RedlavaWhatsAppTemplatePayload,
  type WhatsAppSendResult,
} from "@/lib/integrations/redlava";

export type CrmLeadTemplateParams = {
  organizationId: string;
  toPhone: string;
  assigneeName: string;
  leadName: string;
  leadContact: string;
};

function sliceTemplateParam(value: string) {
  return value.trim().slice(0, 900) || "-";
}

function buildCrmLeadTemplatePayload(
  params: CrmLeadTemplateParams,
): RedlavaWhatsAppTemplatePayload {
  const templateName =
    process.env.WHATSAPP_CRM_LEAD_TEMPLATE?.trim() ||
    ASSIGN_CRM_LEAD_TEMPLATE_NAME;

  return enforceRedlavaTemplateLanguage({
    name: templateName,
    language: { code: ASSIGN_CRM_LEAD_TEMPLATE_LANGUAGE },
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: sliceTemplateParam(params.assigneeName) },
          { type: "text", text: sliceTemplateParam(params.leadName) },
          { type: "text", text: sliceTemplateParam(params.leadContact) },
        ],
      },
    ],
  });
}

async function sendViaMetaCloud(
  params: CrmLeadTemplateParams,
  credentials: {
    metaToken: string | null;
    metaPhoneId: string | null;
  },
): Promise<WhatsAppSendResult> {
  const token = credentials.metaToken?.trim();
  const phoneNumberId = credentials.metaPhoneId?.trim();
  if (!token || !phoneNumberId) {
    return { sent: false, reason: "not_configured" };
  }

  const to = normalizeWhatsAppPhone(params.toPhone);
  if (!to) {
    return { sent: false, reason: "invalid_phone" };
  }

  const template = buildCrmLeadTemplatePayload(params);
  const version = process.env.WHATSAPP_API_VERSION ?? "v21.0";
  const response = await fetch(
    `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template,
      }),
    },
  );

  const raw = await response.text();
  return parseWhatsAppSendResponse(response, raw, {
    messageType: "template",
    templateLanguageCode: ASSIGN_CRM_LEAD_TEMPLATE_LANGUAGE,
  });
}

export async function sendCrmLeadAssignmentTemplate(
  params: CrmLeadTemplateParams,
): Promise<WhatsAppSendResult> {
  const workspace = await resolveWorkspaceWhatsAppCredentials(params.organizationId);
  const redlavaCreds: RedlavaCredentials | null = workspace.redlavaApiKey
    ? { apiKey: workspace.redlavaApiKey, phoneId: workspace.redlavaPhoneId }
    : null;

  const payload = buildCrmLeadTemplatePayload(params);

  if (isRedlavaConfigured(redlavaCreds)) {
    const result = await sendRedlavaTemplateMessage(
      { toPhone: params.toPhone, template: payload },
      redlavaCreds,
    );
    if (result.sent || result.reason === "phone_id_required") {
      return result;
    }
    if (workspace.metaAccessToken && workspace.redlavaPhoneId) {
      return sendViaMetaCloud(params, {
        metaToken: workspace.metaAccessToken,
        metaPhoneId: workspace.redlavaPhoneId,
      });
    }
    return result;
  }

  return sendViaMetaCloud(params, {
    metaToken: workspace.metaAccessToken,
    metaPhoneId: workspace.redlavaPhoneId,
  });
}
