import { LiveInboxPanel } from "@/components/saas/live-inbox-panel";
import { requireAiSession } from "@/lib/require-session";
import { formatWhatsAppPhone } from "@/lib/phone";
import {
  getWaConversation,
  listWaConversations,
  markConversationRead,
  parseContactTags,
  parseAiSourceTitles,
} from "@/lib/wa-inbox-store";
import {
  getWorkspaceWhatsAppSettings,
  resolveWorkspaceWhatsAppCredentials,
} from "@/lib/whatsapp-settings";

export default async function SheetomaticAiInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const user = await requireAiSession();
  const { c: selectedId } = await searchParams;
  const [conversations, credentials, settings] = await Promise.all([
    listWaConversations(user.organizationId),
    resolveWorkspaceWhatsAppCredentials(user.organizationId),
    getWorkspaceWhatsAppSettings(user.organizationId),
  ]);

  const rows = conversations.map((conversation) => ({
    id: conversation.id,
    preview: conversation.preview,
    lastMessageAt: conversation.lastMessageAt ?? null,
    aiHandled: conversation.aiHandled,
    contact: {
      id: conversation.contact.id,
      name: conversation.contact.name,
      phone: conversation.contact.phone,
      email: conversation.contact.email,
      city: conversation.contact.city,
      requirementDescription: conversation.contact.requirementDescription,
      leadCaptureComplete: conversation.contact.leadCaptureComplete,
      intent: conversation.contact.intent,
      source: conversation.contact.source,
      unreadCount: conversation.contact.unreadCount,
      aiEnabled: conversation.contact.aiEnabled,
      tags: parseContactTags(conversation.contact.tags),
      notes: conversation.contact.notes,
      assignedToName:
        conversation.contact.assignedTo?.name ??
        conversation.contact.assignedTo?.email ??
        null,
    },
  }));

  const activeId = selectedId ?? rows[0]?.id ?? null;
  const active = activeId
    ? await getWaConversation(user.organizationId, activeId)
    : null;

  if (active) {
    await markConversationRead(user.organizationId, active.id);
  }

  const messages =
    active?.messages.map((message) => ({
      id: message.id,
      direction: message.direction,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      aiGenerated: message.aiGenerated,
      aiConfidence: message.aiConfidence,
      aiSourceTitles: parseAiSourceTitles(message.aiSourceTitles),
      senderName:
        message.sentBy?.name ??
        message.sentBy?.email ??
        (message.aiGenerated ? "Sheetomatic AI" : null),
    })) ?? [];

  const connected = Boolean(
    credentials.redlavaApiKey &&
      (credentials.redlavaPhoneId || settings?.redlavaPhoneId),
  );

  return (
    <div className="saas-page ws-inbox-page">
      {!connected ? (
        <p className="saas-form-message error ws-inbox-setup-banner">
          WhatsApp is not connected yet.{" "}
          <a href="/ai/app/settings">Open Settings</a> to add your RedLava API key,
          then go live from Campaign.
        </p>
      ) : null}
      <LiveInboxPanel
        activeConversationId={activeId}
        conversations={rows}
        emptyHint={
          settings?.botLiveAt
            ? `Messages to ${formatWhatsAppPhone(credentials.businessPhone ?? "") || "your business number"} will appear here. Inbox refreshes every 45 seconds.`
            : "Customer AI is off — Go Live from Campaign for auto-replies. Task delegation on WhatsApp still works for your team without Go Live."
        }
        messages={messages}
      />
    </div>
  );
}
