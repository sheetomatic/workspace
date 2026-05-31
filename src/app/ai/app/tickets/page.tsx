import { Ticket } from "lucide-react";
import { AiModuleHub } from "@/components/saas/ai-module-hub";
import { requireSession } from "@/lib/require-session";
import { getAiDashboardStats } from "@/lib/ai-dashboard-stats";

export default async function SheetomaticAiTicketsPage() {
  const user = await requireSession("VIEWER", { redirectTo: "/ai/app" });
  const stats = await getAiDashboardStats(user.organizationId);

  return (
    <AiModuleHub
      cards={[
        {
          title: "Support chats",
          text: "Review open WhatsApp conversations that may need tickets.",
          href: "/ai/app/inbox",
          linkLabel: "Open Chats",
          badge: `${stats.openConversations} open`,
        },
        {
          title: "Contacts & CRM",
          text: "View lead intent, pipeline stage, and contact history.",
          href: "/ai/app/contacts",
          linkLabel: "Open Contacts",
          badge: `${stats.contacts} contacts`,
        },
        {
          title: "AI handoff",
          text: "Low-confidence AI replies are flagged for human follow-up in Chats.",
          href: "/ai/app/inbox",
          linkLabel: "Review inbox",
        },
        {
          title: "WhatsApp templates",
          text: "Send approved template messages for follow-ups and notifications.",
          href: "/ai/app/templates",
          linkLabel: "Open Templates",
        },
      ]}
      description="Track support issues from WhatsApp chats. Full ticket board is coming soon - use Chats and Contacts today."
      icon={Ticket}
      primaryHref="/ai/app/inbox"
      primaryLabel="Open Chats"
      secondaryHref="/ai/app/contacts"
      secondaryLabel="Open Contacts"
      title="Tickets"
    />
  );
}
