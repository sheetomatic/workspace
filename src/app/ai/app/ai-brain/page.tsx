import Link from "next/link";
import { Bot, ChevronRight } from "lucide-react";
import { requireSession } from "@/lib/require-session";
import { getAiDashboardStats } from "@/lib/ai-dashboard-stats";

export default async function SheetomaticAiBrainPage() {
  const user = await requireSession("ADMIN", { redirectTo: "/ai/app" });
  const stats = await getAiDashboardStats(user.organizationId);

  return (
    <div className="saas-page ai-joyz-page">
      <div className="ai-joyz-agents-list">
        <div className="ai-joyz-agents-head">
          <span className="ai-joyz-connect-icon" aria-hidden>
            <Bot size={24} strokeWidth={1.75} />
          </span>
          <div>
            <h1>AI Agents</h1>
            <p>Manage how Sheetomatic AI handles WhatsApp conversations.</p>
          </div>
        </div>

        <Link className="ai-joyz-agent-row" href="/ai/app/ai-brain/kb-search">
          <div>
            <strong>Kb Search Agent (System default)</strong>
            <span>Answers customer queries from your training data</span>
          </div>
          <span className={`ai-joyz-live-badge${stats.isLive ? " is-live" : ""}`}>
            <span aria-hidden className="ai-joyz-live-dot" />
            {stats.isLive ? "Live" : "Draft"}
          </span>
          <ChevronRight size={18} aria-hidden />
        </Link>

        <p className="ai-joyz-agent-note">
          Custom agents with dedicated tasks and actions are coming soon. For now, train
          the default agent from{" "}
          <Link href="/ai/app/knowledge">AI Training Data</Link> ({stats.knowledgeSources}{" "}
          sources).
        </p>
      </div>
    </div>
  );
}
