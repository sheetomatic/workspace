import { LiveInboxPanel } from "@/components/saas/live-inbox-panel";
import { PageHeader } from "@/components/saas/page-header";
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
import { getWhatsAppGoLiveStatus } from "@/lib/whatsapp-go-live";
import { hasActiveWhatsAppSession } from "@/lib/whatsapp-session";
import { isWhatsAppProviderConfigured } from "@/lib/integrations/whatsapp-provider";

export default async function SheetomaticAiInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const user = await requireAiSession();
  const { c: selectedId } = await searchParams;
  const [conversations, credentials, settings, goLiveStatus] = await Promise.all([
    listWaConversations(user.organizationId),
    resolveWorkspaceWhatsAppCredentials(user.organizationId),
    getWorkspaceWhatsAppSettings(user.organizationId),
    getWhatsAppGoLiveStatus(user.organizationId),
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

  const connected = isWhatsAppProviderConfigured(credentials);
  const sessionActive = active
    ? await hasActiveWhatsAppSession(user.organizationId, active.contact.phone)
    : true;

  return (
    <div className="saas-page ws-inbox-page">
      <PageHeader
        title="Chats"
        description="Reply to customers on Official WhatsApp. Inbound messages arrive via webhook; this view refreshes every 10 seconds."
      />

      {!connected ? (
        <p className="saas-form-message error ws-inbox-setup-banner">
          WhatsApp is not connected yet.{" "}
          <a href="/ai/app/settings#official-api">Open Settings</a> to add your Official
          API key, register the webhook, then go live from Campaign.
        </p>
      ) : !goLiveStatus.webhookReceived ? (
        <p className="saas-form-message error ws-inbox-setup-banner">
          No inbound messages received yet. Register webhook{" "}
          <code>{goLiveStatus.webhookUrlWithToken}</code> in Sheetomatic WhatsApp / Meta, then send a test
          message to{" "}
          {formatWhatsAppPhone(credentials.businessPhone ?? settings?.businessPhone ?? "") ||
            "your business number"}
          .
        </p>
      ) : null}

      <LiveInboxPanel
        activeConversationId={activeId}
        conversations={rows}
        emptyHint={
          connected
            ? `Messages to ${formatWhatsAppPhone(credentials.businessPhone ?? settings?.businessPhone ?? "") || "your business number"} appear here. Select a chat and type your reply below.`
            : "Connect Official WhatsApp in Settings first."
        }
        messages={messages}
        sessionActive={sessionActive}
        webhookReceived={goLiveStatus.webhookReceived}
        whatsAppLive={goLiveStatus.isLive}
      />
    </div>
  );
}
