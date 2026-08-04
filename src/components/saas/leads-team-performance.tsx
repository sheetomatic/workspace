"use client";

import { useMemo, useState, useTransition } from "react";
import {
  fetchTeamPerformanceAction,
  fetchTeamPerformanceDrilldownAction,
} from "@/app/app/leads/team-performance-actions";
import type {
  TeamMemberPerf,
  TeamPerfDrilldownItem,
  TeamPerfMetricKey,
  TeamPerformanceData,
} from "@/lib/leads/team-performance";

type MetricDef = {
  key: TeamPerfMetricKey;
  label: string;
  count: (m: TeamMemberPerf) => number;
  sub?: (m: TeamMemberPerf) => string | null;
  accent?: string;
};

const METRICS: MetricDef[] = [
  { key: "leads", label: "Leads", count: (m) => m.leads },
  { key: "calls", label: "Calls", count: (m) => m.calls },
  { key: "meetings", label: "Meetings", count: (m) => m.meetings },
  {
    key: "quotes",
    label: "Quotes sent",
    count: (m) => m.quotes,
    sub: (m) => (m.quotes > 0 ? m.quotesValueLabel : null),
  },
  { key: "converted", label: "Converted", count: (m) => m.converted, accent: "good" },
  {
    key: "payments",
    label: "Payments",
    count: (m) => m.payments,
    sub: (m) => (m.payments > 0 ? m.paymentsValueLabel : null),
    accent: "good",
  },
  { key: "projectsDelivered", label: "Projects done", count: (m) => m.projectsDelivered },
  { key: "projectsPending", label: "Projects open", count: (m) => m.projectsPending, accent: "warn" },
  { key: "paymentFollowUps", label: "Pay follow-ups", count: (m) => m.paymentFollowUps },
  { key: "overduePayments", label: "Overdue pay", count: (m) => m.overduePayments, accent: "bad" },
];

function lastMonths(count: number) {
  const options: { key: string; label: string }[] = [];
  const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  let y = now.getUTCFullYear();
  let m = now.getUTCMonth() + 1;
  for (let i = 0; i < count; i += 1) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
    options.push({ key, label });
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
  }
  return options;
}

type DrillState = {
  metricLabel: string;
  memberName: string;
  metric: TeamPerfMetricKey;
  userId: string | null;
  items: TeamPerfDrilldownItem[] | null;
  error: string | null;
};

export function LeadsTeamPerformance({ initial }: { initial: TeamPerformanceData }) {
  const [data, setData] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [drill, setDrill] = useState<DrillState | null>(null);
  const monthOptions = useMemo(() => lastMonths(18), []);

  function changeMonth(monthKey: string) {
    setDrill(null);
    startTransition(async () => {
      const result = await fetchTeamPerformanceAction(monthKey);
      if (result.ok) setData(result.data);
    });
  }

  function openDrill(member: TeamMemberPerf, metric: MetricDef) {
    if (metric.count(member) === 0) return;
    setDrill({
      metricLabel: metric.label,
      memberName: member.name,
      metric: metric.key,
      userId: member.userId,
      items: null,
      error: null,
    });
    startTransition(async () => {
      const result = await fetchTeamPerformanceDrilldownAction({
        monthKey: data.monthKey,
        metric: metric.key,
        userId: member.userId,
      });
      setDrill((current) => {
        if (!current || current.metric !== metric.key || current.userId !== member.userId) {
          return current;
        }
        return result.ok
          ? { ...current, items: result.items }
          : { ...current, error: result.message };
      });
    });
  }

  const maxCategoryCount = Math.max(1, ...data.byCategory.map((c) => c.count));

  return (
    <section className="leads-teamperf" aria-label="Team performance">
      <header className="leads-teamperf-head">
        <div>
          <h2>Team performance</h2>
          <p>
            Assignee-wise numbers for {data.monthLabel}. Click any number to see
            the items behind it. Projects open and overdue payments are current
            totals, not month-bound.
          </p>
        </div>
        <label className="leads-teamperf-month">
          Month
          <select
            value={data.monthKey}
            onChange={(e) => changeMonth(e.target.value)}
            disabled={pending}
          >
            {monthOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      {pending ? <p className="leads-teamperf-loading">Loading…</p> : null}

      <div className="leads-teamperf-grid">
        {[data.totals, ...data.members].map((member) => (
          <article
            key={member.userId ?? member.name}
            className={`leads-teamperf-card${member === data.totals ? " is-total" : ""}`}
          >
            <h3>{member.name}</h3>
            <div className="leads-teamperf-chips">
              {METRICS.map((metric) => {
                const count = metric.count(member);
                const sub = metric.sub?.(member) ?? null;
                return (
                  <button
                    key={metric.key}
                    type="button"
                    className={`leads-teamperf-chip${count > 0 && metric.accent ? ` is-${metric.accent}` : ""}${count === 0 ? " is-zero" : ""}`}
                    onClick={() => openDrill(member, metric)}
                    disabled={count === 0}
                    title={`Show ${metric.label.toLowerCase()} for ${member.name}`}
                  >
                    <span className="leads-teamperf-chip-label">{metric.label}</span>
                    <strong>{count}</strong>
                    {sub ? <small>{sub}</small> : null}
                  </button>
                );
              })}
            </div>
          </article>
        ))}
      </div>

      {data.byCategory.length > 0 ? (
        <div className="leads-teamperf-cats">
          <h3>Leads by category · {data.monthLabel}</h3>
          <ul>
            {data.byCategory.map((cat) => (
              <li key={cat.category}>
                <span className="leads-teamperf-cat-label">{cat.label}</span>
                <span className="leads-teamperf-cat-bar">
                  <span
                    style={{ width: `${Math.max(4, (cat.count / maxCategoryCount) * 100)}%` }}
                  />
                </span>
                <span className="leads-teamperf-cat-count">
                  {cat.count}
                  {cat.value > 0 ? <small> · {cat.valueLabel}</small> : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {drill ? (
        <div
          className="leads-teamperf-modal"
          role="dialog"
          aria-label={`${drill.memberName} — ${drill.metricLabel}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDrill(null);
          }}
        >
          <div className="leads-teamperf-modal-card">
            <header>
              <h3>
                {drill.memberName} · {drill.metricLabel} · {data.monthLabel}
              </h3>
              <button type="button" onClick={() => setDrill(null)} aria-label="Close">
                ✕
              </button>
            </header>
            {drill.error ? (
              <p className="leads-teamperf-err">{drill.error}</p>
            ) : !drill.items ? (
              <p className="leads-teamperf-loading">Loading…</p>
            ) : drill.items.length === 0 ? (
              <p className="leads-teamperf-loading">Nothing found for this period.</p>
            ) : (
              <ul className="leads-teamperf-items">
                {drill.items.map((item) => (
                  <li key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      {item.subtitle ? <span>{item.subtitle}</span> : null}
                    </div>
                    <div className="leads-teamperf-item-right">
                      {item.amountLabel ? <strong>{item.amountLabel}</strong> : null}
                      <time>{item.dateLabel}</time>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
