import type { RedlavaCredentials } from "@/lib/integrations/redlava";
import {
  isRedlavaConfigured,
  sendRedlavaWhatsAppMessage,
} from "@/lib/integrations/redlava";
import { resolveWorkspaceWhatsAppCredentials } from "@/lib/whatsapp-settings";
import { normalizeWhatsAppPhone } from "@/lib/phone";
import type { WhatsAppInteractivePayload } from "@/lib/whatsapp-bot/interactive-menu";

type SendResult =
  | { sent: true }
  | {
      sent: false;
      reason: "invalid_phone" | "not_configured" | "phone_id_required" | "api_error";
      detail?: string;
    };

async function resolveOrgCredentials(organizationId: string) {
  const creds = await resolveWorkspaceWhatsAppCredentials(organizationId);
  const redlava: RedlavaCredentials | null = creds.redlavaApiKey
    ? { apiKey: creds.redlavaApiKey, phoneId: creds.redlavaPhoneId }
    : null;
  const metaToken =
    creds.metaAccessToken || process.env.WHATSAPP_ACCESS_TOKEN?.trim() || "";
  const phoneNumberId =
    creds.redlavaPhoneId ||
    process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ||
    "";

  return { redlava, metaToken, phoneNumberId };
}

async function sendViaMetaCloud(params: {
  toPhone: string;
  payload: Record<string, unknown>;
  accessToken: string;
  phoneNumberId: string;
}): Promise<SendResult> {
  const to = normalizeWhatsAppPhone(params.toPhone);
  if (!to) {
    return { sent: false, reason: "invalid_phone" };
  }

  const version = process.env.WHATSAPP_API_VERSION ?? "v21.0";
  const response = await fetch(
    `https://graph.facebook.com/${version}/${params.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        ...params.payload,
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    return {
      sent: false,
      reason: "api_error",
      detail: detail.slice(0, 300),
    };
  }

  return { sent: true };
}

async function deliverMessage(
  organizationId: string,
  toPhone: string,
  payload: Record<string, unknown>,
): Promise<SendResult> {
  const { redlava, metaToken, phoneNumberId } =
    await resolveOrgCredentials(organizationId);

  if (isRedlavaConfigured(redlava)) {
    const result = await sendRedlavaWhatsAppMessage(
      { toPhone, message: payload },
      redlava,
    );
    if (result.sent || result.reason === "phone_id_required") {
      return result;
    }
    if (result.reason !== "not_configured") {
      return result;
    }
  }

  if (metaToken && phoneNumberId) {
    return sendViaMetaCloud({
      toPhone,
      payload,
      accessToken: metaToken,
      phoneNumberId,
    });
  }

  return { sent: false, reason: "not_configured" };
}

export async function sendWhatsAppText(params: {
  organizationId: string;
  toPhone: string;
  body: string;
}) {
  return deliverMessage(params.organizationId, params.toPhone, {
    type: "text",
    text: { body: params.body.slice(0, 4096) },
  });
}

export async function sendWhatsAppInteractive(params: {
  organizationId: string;
  toPhone: string;
  interactive: WhatsAppInteractivePayload;
}) {
  return deliverMessage(params.organizationId, params.toPhone, params.interactive);
}

/** List menu with plain-text fallback if interactive messages are rejected. */
export async function sendWhatsAppInteractiveWithFallback(params: {
  organizationId: string;
  toPhone: string;
  interactive: WhatsAppInteractivePayload;
  fallbackText: string;
}) {
  const result = await sendWhatsAppInteractive({
    organizationId: params.organizationId,
    toPhone: params.toPhone,
    interactive: params.interactive,
  });

  if (result.sent) {
    return result;
  }

  return sendWhatsAppText({
    organizationId: params.organizationId,
    toPhone: params.toPhone,
    body: params.fallbackText,
  });
}
