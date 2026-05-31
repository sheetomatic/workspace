import { AiAppHomeGate } from "@/components/saas/ai-app-gate";
import { needsAiOnboarding } from "@/lib/ai-onboarding";
import { requireSession } from "@/lib/require-session";
import { getAiDashboardStats } from "@/lib/ai-dashboard-stats";

export default async function SheetomaticAiDashboardPage() {
  const user = await requireSession("VIEWER", { redirectTo: "/ai/app" });
  const stats = await getAiDashboardStats(user.organizationId);
  const needsOnboarding = await needsAiOnboarding(user.organizationId);

  return (
    <AiAppHomeGate
      needsOnboarding={needsOnboarding}
      stats={{
        organizationName: stats.organizationName,
        contacts: stats.contacts,
        openConversations: stats.openConversations,
        knowledgeSources: stats.knowledgeSources,
        unreadMessages: stats.unreadMessages,
        integrationsConnected: stats.integrationsConnected,
        isLive: stats.isLive,
      }}
    />
  );
}
