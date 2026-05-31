import { AiConnectIntegrationsPanel } from "@/components/saas/ai-connect-integrations-panel";
import { requireSession } from "@/lib/require-session";
import { getAiDashboardStats } from "@/lib/ai-dashboard-stats";

export default async function SheetomaticAiIntegrationsPage() {
  const user = await requireSession("ADMIN", { redirectTo: "/ai/app" });
  const stats = await getAiDashboardStats(user.organizationId);

  return (
    <div className="saas-page ai-joyz-page">
      <AiConnectIntegrationsPanel
        isLive={stats.isLive}
        whatsAppConnected={stats.integrationsConnected}
      />
    </div>
  );
}
