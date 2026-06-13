import type { MetaWebhookPayload } from "@/lib/whatsapp-bot/process-message";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function pickString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeMetaMessage(raw: UnknownRecord) {
  const id = pickString(raw.id) ?? pickString(raw.messageId) ?? pickString(raw.wamid);
  const from =
    pickString(raw.from) ??
    pickString(raw.sender) ??
    pickString(raw.wa_id) ??
    pickString(raw.phone);

  if (!id || !from) {
    return null;
  }

  const type = pickString(raw.type) ?? "text";
  const textBody =
    (isRecord(raw.text) ? pickString(raw.text.body) : null) ??
    pickString(raw.body) ??
    pickString(raw.message);

  return {
    id,
    from: from.replace(/\D/g, ""),
    type,
    ...(textBody ? { text: { body: textBody } } : {}),
    ...(isRecord(raw.audio) ? { audio: raw.audio } : {}),
    ...(isRecord(raw.voice) ? { voice: raw.voice } : {}),
    ...(isRecord(raw.interactive) ? { interactive: raw.interactive } : {}),
  };
}

function wrapMetaPayload(
  phoneNumberId: string,
  messages: NonNullable<ReturnType<typeof normalizeMetaMessage>>[],
): MetaWebhookPayload {
  return {
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { phone_number_id: phoneNumberId },
              messages,
            },
          },
        ],
      },
    ],
  };
}

/**
 * Accept Meta Cloud API webhooks, Sheetomatic WhatsApp partner wrappers,
 * and Message Auto Sender inbound payloads.
 */
export function normalizeWhatsAppWebhookPayload(
  payload: unknown,
): MetaWebhookPayload | null {
  if (!isRecord(payload)) {
    return null;
  }

  const metaEntry = Array.isArray(payload.entry) ? payload.entry[0] : null;
  const metaChange =
    isRecord(metaEntry) && Array.isArray(metaEntry.changes)
      ? metaEntry.changes[0]
      : null;
  const metaValue = isRecord(metaChange) ? metaChange.value : null;
  const metaMessages = isRecord(metaValue) ? metaValue.messages : null;
  const metaPhoneId =
    isRecord(metaValue) && isRecord(metaValue.metadata)
      ? pickString(metaValue.metadata.phone_number_id)
      : null;

  if (Array.isArray(metaMessages) && metaMessages.length > 0 && metaPhoneId) {
    return payload as MetaWebhookPayload;
  }

  const phoneNumberId =
    pickString(payload.phone_number_id) ??
    pickString(payload.phoneNumberId) ??
    pickString(payload.phoneId) ??
    (isRecord(payload.metadata)
      ? pickString(payload.metadata.phone_number_id)
      : null) ??
    (isRecord(payload.value) && isRecord(payload.value.metadata)
      ? pickString(payload.value.metadata.phone_number_id)
      : null);

  const rawMessages =
    (Array.isArray(payload.messages) ? payload.messages : null) ??
    (isRecord(payload.data) && Array.isArray(payload.data.messages)
      ? payload.data.messages
      : null) ??
    (isRecord(payload.value) && Array.isArray(payload.value.messages)
      ? payload.value.messages
      : null) ??
    (isRecord(payload.message) ? [payload.message] : null);

  if (!phoneNumberId || !rawMessages?.length) {
    const masSender =
      pickString(payload.senderMobileNo) ??
      pickString(payload.sender) ??
      pickString(payload.from);
    const masMessage =
      pickString(payload.message) ??
      pickString(payload.messageText) ??
      pickString(payload.text);
    const masId =
      pickString(payload.id) ??
      pickString(payload.messageId) ??
      `mas-${Date.now()}`;
    const masAccountId =
      pickString(payload.accountId) ??
      pickString(payload.username) ??
      pickString(payload.accountUsername) ??
      "mas";

    if (masSender && masMessage) {
      return wrapMetaPayload(masAccountId, [
        {
          id: masId,
          from: masSender.replace(/\D/g, ""),
          type: "text",
          text: { body: masMessage },
        },
      ]);
    }

    return null;
  }

  const messages = rawMessages
    .filter(isRecord)
    .map(normalizeMetaMessage)
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (!messages.length) {
    return null;
  }

  return wrapMetaPayload(phoneNumberId, messages);
}
