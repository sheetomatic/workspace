import type { RedlavaCredentials } from "@/lib/integrations/redlava";
import {
  credentialsForCustomerBot,
  deliverWhatsAppMessage,
} from "@/lib/integrations/whatsapp-provider";
import { resolveWorkspaceWhatsAppCredentials } from "@/lib/whatsapp-settings";
import type { WhatsAppInteractivePayload } from "@/lib/whatsapp-bot/interactive-menu";

type SendResult = Awaited<ReturnType<typeof deliverWhatsAppMessage>>;

async function deliverMessage(
  organizationId: string,
  toPhone: string,
  payload: Record<string, unknown>,
): Promise<SendResult> {
  const credentials = credentialsForCustomerBot(
    await resolveWorkspaceWhatsAppCredentials(organizationId),
  );
  return deliverWhatsAppMessage({
    organizationId,
    toPhone,
    message: payload,
    credentials,
    preferOfficial: true,
  });
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

/** @deprecated Use deliverWhatsAppMessage — kept for template modules that pass pre-resolved creds. */
export type { RedlavaCredentials };
