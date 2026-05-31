import { AiTrainingDataPanel } from "@/components/saas/ai-training-data-panel";
import {
  getKnowledgeMenuItems,
  listOrganizationKnowledgeItems,
} from "@/lib/ai-knowledge-store";
import { requireSession } from "@/lib/require-session";
import { sortKnowledgeMenuItems } from "@/lib/whatsapp-bot/knowledge-menu";
import {
  getWorkspaceWhatsAppSettings,
  resolveWorkspaceWhatsAppCredentials,
} from "@/lib/whatsapp-settings";

export default async function SheetomaticAiKnowledgePage() {
  const user = await requireSession("ADMIN", { redirectTo: "/ai/app" });
  const [items, credentials, settings, menuItems] = await Promise.all([
    listOrganizationKnowledgeItems(user.organizationId),
    resolveWorkspaceWhatsAppCredentials(user.organizationId),
    getWorkspaceWhatsAppSettings(user.organizationId),
    getKnowledgeMenuItems(user.organizationId),
  ]);

  const rows = items.map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    question: item.question,
    content: item.content,
    sourceUrl: item.sourceUrl,
    status: item.status,
    lastSyncedAt: item.lastSyncedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    createdBy: item.createdBy,
  }));

  const stats = {
    total: rows.length,
    faq: rows.filter((item) => item.type === "FAQ").length,
    document: rows.filter((item) => item.type === "DOCUMENT").length,
    website: rows.filter((item) => item.type === "WEBSITE").length,
    youtube: rows.filter((item) => item.type === "YOUTUBE_CHANNEL").length,
  };

  const whatsAppConnected = Boolean(
    credentials.redlavaApiKey &&
      (credentials.redlavaPhoneId || settings?.redlavaPhoneId),
  );

  return (
    <div className="saas-page ws-wa-page-shell ai-joyz-page">
      <AiTrainingDataPanel
        botLive={Boolean(settings?.botLiveAt)}
        items={rows}
        menuPreviewItems={sortKnowledgeMenuItems(menuItems).slice(0, 10)}
        stats={stats}
        whatsAppConnected={whatsAppConnected}
      />
    </div>
  );
}
