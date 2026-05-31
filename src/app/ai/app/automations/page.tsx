import { Workflow } from "lucide-react";
import { AiModuleHub } from "@/components/saas/ai-module-hub";
import { requireSession } from "@/lib/require-session";
import { getAiDashboardStats } from "@/lib/ai-dashboard-stats";

export default async function SheetomaticAiAutomationsPage() {
  const user = await requireSession("ADMIN", { redirectTo: "/ai/app" });
  const stats = await getAiDashboardStats(user.organizationId);

  return (
    <AiModuleHub
      cards={[
        {
          title: "Customer AI replies",
          text: "Answer leads from your training data when WhatsApp AI is live.",
          href: "/ai/app/knowledge",
          linkLabel: "Manage training data",
          badge: stats.isLive && stats.knowledgeSources > 0 ? "Active" : "Setup",
        },
        {
          title: "Task delegation",
          text: "Managers delegate tasks by voice or text on WhatsApp.",
          href: "/ai/app/campaign",
          linkLabel: "Open Campaign",
          badge: stats.isLive ? "Live" : "Paused",
        },
        {
          title: "Human handoff",
          text: "Take over chats manually from the team inbox.",
          href: "/ai/app/inbox",
          linkLabel: "Open Chats",
          badge: stats.openConversations > 0 ? `${stats.openConversations} open` : "Empty",
        },
        {
          title: "Team routing",
          text: "Add manager WhatsApp numbers and connection settings.",
          href: "/ai/app/settings",
          linkLabel: "Open Settings",
          badge: stats.integrationsConnected ? "Connected" : "Not connected",
        },
      ]}
      description="Active WhatsApp flows for AI replies, task delegation, and human handoff."
      icon={Workflow}
      primaryHref="/ai/app/campaign"
      primaryLabel="Go Live"
      secondaryHref="/ai/app/inbox"
      secondaryLabel="Open Chats"
      title="Workflows"
    />
  );
}
