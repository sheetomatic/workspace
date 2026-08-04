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
  accent: string;
  count: (m: TeamMemberPerf) => number;
  sub?: (m: TeamMemberPerf) => string | null;
};

const METRICS: MetricDef[] = [
  { key: "leads", label: "Leads", accent: "accent-blue", count: (m) => m.leads },
  { key: "calls", label: "Calls", accent: "accent-indigo", count: (m) => m.calls },
  { key: "meetings", label: "Meetings", accent: "accent-indigo", count: (m) => m.meetings },
  {
    key: "quotes",
    label: "Quotations generated",
    accent: "accent-purple",
    count: (m) => m.quotes,
    sub: (m) => (m.quotes > 0 ? m.quotesValueLabel : null),
  },
  {
    key: "invoices",
    label: "Invoices generated",
    accent: "accent-indigo",
    count: (m) => m.invoices,
    sub: (m) => (m.invoices > 0 ? m.invoicesValueLabel : null),
  },
  { key: "converted", label: "Leads converted", accent: "accent-success", count: (m) => m.converted },
  {
    key: "payments",
    label: "Payment received",
    accent: "accent-success",
    count: (m) => m.payments,
    sub: (m) => (m.payments > 0 ? m.paymentsValueLabel : null),
  },
  {
    key: "newClients",
    label: "New clients onboarded",
    accent: "accent-blue",
    count: (m) => m.newClients,
    sub: (m) => (m.newClients > 0 ? "First-time only" : null),
  },
  { key: "projectsDelivered", label: "Projects delivered", accent: "accent-teal", count: (m) => m.projectsDelivered },
  { key: "projectsPending", label: "Projects pending", accent: "accent-warning", count: (m) => m.projectsPending },
  { key: "paymentFollowUps", label: "Payment follow-ups", accent: "accent-warning", count: (m) => m.paymentFollowUps },
  { key: "overduePayments", label: "Overdue payments", accent: "accent-danger", count: (m) => m.overduePayments },
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

const TOTAL_VALUE = "total";
const UNASSIGNED_VALUE = "unassigned";

export function LeadsTeamPerformance({ initial }: { initial: TeamPerformanceData }) {
  const [data, setData] = useState(initial);
  const [selected, setSelected] = useState(TOTAL_VALUE);
  const [pending, startTransition] = useTransition();
  const [drill, setDrill] = useState<DrillState | null>(null);
  const monthOptions = useMemo(() => lastMonths(18), []);

  const namedMembers = data.members.filter((m) => m.userId !== null);
  const unassigned = data.members.find((m) => m.userId === null) ?? null;

  const shown: TeamMemberPerf =
    selected === TOTAL_VALUE
      ? data.totals
      : selected === UNASSIGNED_VALUE
        ? (unassigned ?? data.totals)
        : (namedMembers.find((m) => m.userId === selected) ?? data.totals);
  const isTotal = shown === data.totals;

  function changeMonth(monthKey: string) {
    setDrill(null);
    startTransition(async () => {
      const result = await fetchTeamPerformanceAction(monthKey);
      if (result.ok) setData(result.data);
    });
  }

  function openDrill(metric: MetricDef) {
    if (metric.count(shown) === 0) return;
    // Team total drills into the whole team; a member drills into their items.
    const userId = isTotal
      ? null
      : selected === UNASSIGNED_VALUE
        ? UNASSIGNED_VALUE
        : shown.userId;
    setDrill({
      metricLabel: metric.label,
      memberName: shown.name,
      metric: metric.key,
      userId,
      items: null,
      error: null,
    });
    startTransition(async () => {
      const result = await fetchTeamPerformanceDrilldownAction({
        monthKey: data.monthKey,
        metric: metric.key,
        userId,
      });
      setDrill((current) => {
        if (!current || current.metric !== metric.key) {
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
            {shown.name} · {data.monthLabel}. Click any card to see the items
            behind it. Projects pending and overdue payments are current totals.
          </p>
        </div>
        <div className="leads-teamperf-controls">
          <label className="leads-teamperf-month">
            Show
            <select
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setDrill(null);
              }}
              disabled={pending}
            >
              <option value={TOTAL_VALUE}>Team total</option>
              {namedMembers.map((member) => (
                <option key={member.userId} value={member.userId!}>
                  {member.name}
                </option>
              ))}
              {unassigned ? (
                <option value={UNASSIGNED_VALUE}>Unassigned</option>
              ) : null}
            </select>
          </label>
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
        </div>
      </header>

      {pending ? <p className="leads-teamperf-loading">Loading…</p> : null}

      <div className="hs-quick-stats">
        {METRICS.map((metric) => {
          const count = metric.count(shown);
          const sub = metric.sub?.(shown) ?? null;
          return (
            <button
              key={metric.key}
              type="button"
              className={`hs-quick-stat leads-pipeline-card leads-teamperf-stat ${metric.accent}${count === 0 ? " is-zero" : ""}`}
              onClick={() => openDrill(metric)}
              disabled={count === 0}
              title={`Show ${metric.label.toLowerCase()} — ${shown.name}`}
            >
              <span>{metric.label}</span>
              <strong>
                {count}
                {sub ? <small className="leads-kpi-sub">{sub}</small> : null}
              </strong>
            </button>
          );
        })}
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
