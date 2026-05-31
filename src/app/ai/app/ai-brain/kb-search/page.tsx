import { AiKbSearchAgentPanel } from "@/components/saas/ai-kb-search-agent-panel";
import { getAiDashboardStats } from "@/lib/ai-dashboard-stats";
import { requireSession } from "@/lib/require-session";

export default async function SheetomaticKbSearchAgentPage() {
  const user = await requireSession("ADMIN", { redirectTo: "/ai/app" });
  const stats = await getAiDashboardStats(user.organizationId);

  return (
    <div className="saas-page ai-joyz-page">
      <AiKbSearchAgentPanel
        isLive={stats.isLive}
        knowledgeSources={stats.knowledgeSources}
      />
    </div>
  );
}
