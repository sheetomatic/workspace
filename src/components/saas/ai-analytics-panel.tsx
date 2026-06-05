import Link from "next/link";
import type { getExtendedAnalytics } from "@/lib/ai-module-data";
import { WA_PIPELINE_LABELS } from "@/lib/wa-crm-shared";
import type { WaPipelineStage } from "@prisma/client";

type AnalyticsData = Awaited<ReturnType<typeof getExtendedAnalytics>>;

function formatMetric(value: number | null, suffix = "") {
  if (value === null) {
    return "-";
  }
  return `${value.toLocaleString("en-IN")}${suffix}`;
}

const PIPELINE_ORDER: WaPipelineStage[] = [
  "NEW",
  "QUALIFIED",
  "DEMO_BOOKED",
  "WON",
  "LOST",
];

export function AiAnalyticsPanel({ data }: { data: AnalyticsData }) {
  const pipelineTotal = PIPELINE_ORDER.reduce(
    (sum, stage) => sum + (data.pipelineMap[stage] ?? 0),
    0,
  );

  return (
    <div className="ai-analytics-page">
      <header className="ai-analytics-head">
        <div>
          <h1>Analytics</h1>
          <p>WhatsApp volume, AI performance, and CRM pipeline - today (IST) and live totals.</p>
        </div>
        <span className={`ai-analytics-live${data.isLive ? " is-on" : ""}`}>
          {data.isLive ? "AI Live" : "AI Paused"}
        </span>
      </header>

      <section className="ai-analytics-section">
        <h2>Today&apos;s activity</h2>
        <div className="ai-analytics-metrics tone-volume">
          {[
            { label: "Inbound chats", value: formatMetric(data.inboundToday) },
            { label: "AI replies", value: formatMetric(data.outboundAiToday) },
            { label: "Team replies", value: formatMetric(data.outboundHumanToday) },
            {
              label: "AI coverage",
              value: formatMetric(
                data.aiResolvedPct,
                data.aiResolvedPct !== null ? "%" : "",
              ),
            },
          ].map((metric) => (
            <article key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="ai-analytics-section">
        <h2>Response quality</h2>
        <div className="ai-analytics-metrics tone-quality">
          {[
            { label: "Avg first reply", value: formatMetric(data.avgResponseSec, data.avgResponseSec !== null ? "s" : "") },
            { label: "Hot / active leads", value: formatMetric(data.hotLeads) },
            { label: "Unread leads", value: formatMetric(data.unreadLeads) },
            { label: "7-day inbound", value: formatMetric(data.weekInbound) },
          ].map((metric) => (
            <article key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="ai-analytics-section">
        <div className="ai-analytics-section-head">
          <h2>CRM pipeline</h2>
          <Link href="/ai/app/contacts">Open CRM</Link>
        </div>
        <div className="ai-analytics-pipeline">
          {PIPELINE_ORDER.map((stage) => {
            const count = data.pipelineMap[stage] ?? 0;
            const pct = pipelineTotal > 0 ? Math.round((count / pipelineTotal) * 100) : 0;
            return (
              <div className="ai-analytics-pipeline-row" key={stage}>
                <span className={`ai-analytics-stage tone-${stage.toLowerCase()}`}>
                  {WA_PIPELINE_LABELS[stage]}
                </span>
                <div className="ai-analytics-bar-track">
                  <div
                    className="ai-analytics-bar-fill"
                    style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}
                  />
                </div>
                <strong>{count}</strong>
              </div>
            );
          })}
        </div>
        {data.overdueFollowUps > 0 ? (
          <p className="ai-analytics-alert">
            {data.overdueFollowUps} overdue CRM follow-up
            {data.overdueFollowUps === 1 ? "" : "s"} -{" "}
            <Link href="/ai/app/contacts">review in CRM</Link>
          </p>
        ) : null}
      </section>

      {!data.isLive ? (
        <p className="ai-analytics-hint">
          Customer AI is off.{" "}
          <Link href="/ai/app/campaign">Go Live from Campaign</Link> to start auto-replies.
          Task delegation still works for your team without Go Live.
        </p>
      ) : null}
    </div>
  );
}
