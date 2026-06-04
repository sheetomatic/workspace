import { PageHeader } from "@/components/saas/page-header";
import { requireAiSession } from "@/lib/require-session";
import { getAiAnalyticsMetrics } from "@/lib/ai-analytics";

function formatMetric(value: number | null, suffix = "") {
  if (value === null) {
    return "—";
  }
  return `${value.toLocaleString("en-IN")}${suffix}`;
}

export default async function SheetomaticAiAnalyticsPage() {
  const user = await requireAiSession();
  const stats = await getAiAnalyticsMetrics(user.organizationId);

  const metrics = [
    { label: "Chats today", value: formatMetric(stats.inboundToday) },
    { label: "AI replies today", value: formatMetric(stats.outboundAiToday) },
    {
      label: "AI coverage",
      value: formatMetric(stats.aiResolvedPct, stats.aiResolvedPct !== null ? "%" : ""),
    },
    { label: "Hot / active leads", value: formatMetric(stats.hotLeads) },
  ];

  return (
    <div className="saas-page ws-ai-dashboard-page">
      <PageHeader
        title="Analytics"
        description="Live WhatsApp volume and AI performance for your workspace (IST day)."
      />
      <div className="crm-metric-grid">
        {metrics.map((metric) => (
          <article className="crm-metric-card" key={metric.label}>
            <div className="crm-metric-head">
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          </article>
        ))}
      </div>
      <p className="ws-empty-inline">
        {stats.isLive
          ? `${stats.openConversations} open conversation${stats.openConversations === 1 ? "" : "s"} · avg first reply ${formatMetric(stats.avgResponseSec, stats.avgResponseSec !== null ? "s" : "")}.`
          : "Customer AI is off — Go Live from Campaign to start auto-replies. Task delegation on WhatsApp still works for your team without Go Live."}
      </p>
    </div>
  );
}
