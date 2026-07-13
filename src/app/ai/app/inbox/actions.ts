"use server";

import { revalidatePath } from "next/cache";
import { AI_APP_MIN_ROLE } from "@/lib/ai-auth-links";
import { getSessionUser } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { sendWhatsAppText } from "@/lib/whatsapp-bot/send";
import {
  clearAllWaInboxHistory,
  getWaConversation,
  markConversationRead,
  recordWaOutboundMessage,
  setWaContactAiEnabled,
} from "@/lib/wa-inbox-store";
import { hasActiveWhatsAppSession } from "@/lib/whatsapp-session";

export type InboxActionState = { ok: boolean; message: string };

/** Admin-only: wipe all WhatsApp chats, contact names, and inbound history for this org. */
export async function clearAllInboxHistory(): Promise<InboxActionState> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, AI_APP_MIN_ROLE)) {
    return { ok: false, message: "You cannot clear inbox history." };
  }

  const result = await clearAllWaInboxHistory(user.organizationId);

  revalidatePath("/ai/app/inbox");
  revalidatePath("/ai/app/contacts");
  revalidatePath("/ai/app/crm");

  return {
    ok: true,
    message: `Cleared ${result.conversations} chats, ${result.contacts} contacts, ${result.messages} messages. New messages will appear fresh.`,
  };
}

export async function sendInboxReply(
  conversationId: string,
  body: string,
): Promise<InboxActionState> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, AI_APP_MIN_ROLE)) {
    return { ok: false, message: "You cannot send replies." };
  }

  const trimmed = body.trim();
  if (!trimmed) {
    return { ok: false, message: "Message cannot be empty." };
  }

  const conversation = await getWaConversation(user.organizationId, conversationId);
  if (!conversation) {
    return { ok: false, message: "Conversation not found." };
  }

  const sessionActive = await hasActiveWhatsAppSession(
    user.organizationId,
    conversation.contact.phone,
  );
  if (!sessionActive) {
    return {
      ok: false,
      message:
        "24-hour reply window closed. Ask the customer to message you again, or send an approved template from Templates.",
    };
  }

  const result = await sendWhatsAppText({
    organizationId: user.organizationId,
    toPhone: conversation.contact.phone,
    body: trimmed,
  });

  if (!result.sent) {
    const detail =
      "detail" in result && typeof result.detail === "string"
        ? result.detail
        : "Could not send WhatsApp message.";
    return {
      ok: false,
      message: detail,
    };
  }

  await recordWaOutboundMessage({
    organizationId: user.organizationId,
    toPhone: conversation.contact.phone,
    body: trimmed,
    sentByUserId: user.id,
    aiGenerated: false,
  });

  await setWaContactAiEnabled(user.organizationId, conversation.contact.id, false);

  revalidatePath("/ai/app/inbox");
  revalidatePath("/ai/app/contacts");
  return { ok: true, message: "Message sent." };
}

export async function setInboxHumanTakeover(
  contactId: string,
  humanTakeover: boolean,
): Promise<InboxActionState> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, AI_APP_MIN_ROLE)) {
    return { ok: false, message: "You cannot change AI settings." };
  }

  const updated = await setWaContactAiEnabled(
    user.organizationId,
    contactId,
    !humanTakeover,
  );

  if (!updated) {
    return { ok: false, message: "Contact not found." };
  }

  revalidatePath("/ai/app/inbox");
  revalidatePath("/ai/app/contacts");
  return {
    ok: true,
    message: humanTakeover
      ? "Human takeover on — AI paused for this contact."
      : "AI re-enabled for this contact.",
  };
}

export async function markInboxConversationRead(
  conversationId: string,
): Promise<void> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, AI_APP_MIN_ROLE)) {
    return;
  }

  await markConversationRead(user.organizationId, conversationId);
  revalidatePath("/ai/app/inbox");
}
