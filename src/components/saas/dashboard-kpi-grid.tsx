import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { DashboardMetricCard, DashboardTaskStats } from "@/lib/dashboard-types";

function trendForCard(card: DashboardMetricCard, max: number) {
  if (max <= 0 || card.numericValue <= 0) {
    return { dir: "flat" as const, pct: 0 };
  }
  const ratio = Math.round((card.numericValue / max) * 100);
  if (card.tone === "WARNING") {
    return { dir: "down" as const, pct: ratio };
  }
  if (card.tone === "SUCCESS") {
    return { dir: "up" as const, pct: ratio };
  }
  return { dir: "flat" as const, pct: ratio };
}

export function DashboardKpiGrid({
  metricCards,
  taskStats,
  approvalsPending,
  showApprovals,
}: {
  metricCards: DashboardMetricCard[];
  taskStats: DashboardTaskStats;
  approvalsPending: number;
  showApprovals: boolean;
}) {
  const maxNumeric = Math.max(...metricCards.map((c) => c.numericValue), 1);

  const quickStats: {
    label: string;
    value: string;
    accent: "default" | "success" | "warning" | "danger";
  }[] = [
    {
      label: "Tasks pending",
      value: String(taskStats.pending),
      accent: taskStats.pending > 5 ? "warning" : "default",
    },
    {
      label: "Overdue tasks",
      value: String(taskStats.overdue),
      accent: taskStats.overdue > 0 ? "danger" : "success",
    },
    {
      label: "Done today",
      value: String(taskStats.completedToday),
      accent: "success",
    },
    ...(showApprovals
      ? [
          {
            label: "Approvals",
            value: String(approvalsPending),
            accent:
              approvalsPending > 0
                ? ("warning" as const)
                : ("default" as const),
          },
        ]
      : []),
  ];

  return (
    <section aria-label="Key metrics" className="hs-kpi-section">
      <div className="hs-quick-stats">
        {quickStats.map((stat) => (
          <article
            className={`hs-quick-stat accent-${stat.accent}`}
            key={stat.label}
          >
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </div>

      {metricCards.length === 0 ? (
        <div className="ws-empty-state crm-dashboard-empty">
          <p>No metrics are visible for your role yet.</p>
        </div>
      ) : (
        <div className="hs-metric-grid">
          {metricCards.map((card) => {
            const trend = trendForCard(card, maxNumeric);
            const barPct = Math.max(
              8,
              Math.round((card.numericValue / maxNumeric) * 100),
            );
            return (
              <article
                className={`hs-metric-card accent-${card.accent}`}
                key={card.id}
              >
                <div className="hs-metric-top">
                  <span className="hs-metric-label">{card.label}</span>
                  <span className={`hs-trend trend-${trend.dir}`}>
                    {trend.dir === "up" ? (
                      <ArrowUpRight size={14} aria-hidden />
                    ) : trend.dir === "down" ? (
                      <ArrowDownRight size={14} aria-hidden />
                    ) : (
                      <Minus size={14} aria-hidden />
                    )}
                    {trend.pct}%
                  </span>
                </div>
                <strong className="hs-metric-value">{card.value}</strong>
                <div className="hs-metric-bar" aria-hidden>
                  <span style={{ width: `${barPct}%` }} />
                </div>
                {card.actionHref ? (
                  <Link className="hs-metric-link" href={card.actionHref}>
                    {card.actionLabel}
                  </Link>
                ) : (
                  <span className="hs-metric-link muted">{card.actionLabel}</span>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
