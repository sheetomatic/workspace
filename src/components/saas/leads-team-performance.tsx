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

type PeriodKind = "d" | "w" | "m" | "q" | "y";

const PERIOD_KINDS: { kind: PeriodKind; label: string }[] = [
  { kind: "d", label: "Day" },
  { kind: "w", label: "Week" },
  { kind: "m", label: "Month" },
  { kind: "q", label: "Quarter" },
  { kind: "y", label: "Year" },
];

const IST_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** "Now" as a UTC Date whose UTC fields read as IST wall-clock. */
function istNow() {
  return new Date(Date.now() + IST_MS);
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function shortDay(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** Recent options for one granularity; first entry is the current period. */
function periodOptions(kind: PeriodKind): { key: string; label: string }[] {
  const now = istNow();
  const options: { key: string; label: string }[] = [];

  if (kind === "d") {
    for (let i = 0; i < 14; i += 1) {
      const d = new Date(now.getTime() - i * DAY_MS);
      const label = i === 0 ? "Today" : i === 1 ? "Yesterday" : shortDay(d);
      options.push({ key: `d:${dayKey(d)}`, label });
    }
    return options;
  }
  if (kind === "w") {
    // Monday of the current IST week.
    const dow = (now.getUTCDay() + 6) % 7;
    const monday = new Date(now.getTime() - dow * DAY_MS);
    for (let i = 0; i < 12; i += 1) {
      const start = new Date(monday.getTime() - i * 7 * DAY_MS);
      const label =
        i === 0
          ? "This week"
          : i === 1
            ? "Last week"
            : `Wk of ${shortDay(start)}`;
      options.push({ key: `w:${dayKey(start)}`, label });
    }
    return options;
  }
  if (kind === "m") {
    let y = now.getUTCFullYear();
    let m = now.getUTCMonth() + 1;
    for (let i = 0; i < 18; i += 1) {
      const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
      options.push({ key: `m:${y}-${String(m).padStart(2, "0")}`, label });
      m -= 1;
      if (m === 0) {
        m = 12;
        y -= 1;
      }
    }
    return options;
  }
  if (kind === "q") {
    let y = now.getUTCFullYear();
    let q = Math.floor(now.getUTCMonth() / 3) + 1;
    for (let i = 0; i < 8; i += 1) {
      options.push({ key: `q:${y}-Q${q}`, label: `Q${q} ${y}` });
      q -= 1;
      if (q === 0) {
        q = 4;
        y -= 1;
      }
    }
    return options;
  }
  const year = now.getUTCFullYear();
  for (let i = 0; i < 5; i += 1) {
    options.push({ key: `y:${year - i}`, label: String(year - i) });
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
  const periodKind = (data.periodKey.slice(0, 1) || "m") as PeriodKind;
  const options = useMemo(() => periodOptions(periodKind), [periodKind]);

  const namedMembers = data.members.filter((m) => m.userId !== null);
  const unassigned = data.members.find((m) => m.userId === null) ?? null;

  const shown: TeamMemberPerf =
    selected === TOTAL_VALUE
      ? data.totals
      : selected === UNASSIGNED_VALUE
        ? (unassigned ?? data.totals)
        : (namedMembers.find((m) => m.userId === selected) ?? data.totals);
  const isTotal = shown === data.totals;

  function changePeriod(periodKey: string) {
    setDrill(null);
    startTransition(async () => {
      const result = await fetchTeamPerformanceAction(periodKey);
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
        periodKey: data.periodKey,
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
            {shown.name} · {data.periodLabel}. Click any card to see the items
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
            Period
            <select
              value={periodKind}
              onChange={(e) => {
                const next = periodOptions(e.target.value as PeriodKind);
                changePeriod(next[0].key);
              }}
              disabled={pending}
            >
              {PERIOD_KINDS.map((option) => (
                <option key={option.kind} value={option.kind}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="leads-teamperf-month">
            Range
            <select
              value={data.periodKey}
              onChange={(e) => changePeriod(e.target.value)}
              disabled={pending}
            >
              {options.some((option) => option.key === data.periodKey) ? null : (
                <option value={data.periodKey}>{data.periodLabel}</option>
              )}
              {options.map((option) => (
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
          <h3>Leads by category · {data.periodLabel}</h3>
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
                {drill.memberName} · {drill.metricLabel} · {data.periodLabel}
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
