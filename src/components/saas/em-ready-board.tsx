"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronRight,
  Clock,
  GitBranch,
  ListTodo,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import type { EmReadyPayload } from "@/lib/em/em-ready-data";
import { formatDeficitPct } from "@/lib/em/em-ready-data";
import { KRA_KPI_SURFACE_HIDDEN } from "@/lib/pms-surface";

function DeficitBadge({
  value,
  size = "md",
}: {
  value: number;
  size?: "sm" | "md" | "lg";
}) {
  const label = formatDeficitPct(value);
  const display = label === "0%" ? "0%" : label;
  const tone =
    value >= 30 ? "is-critical" : value >= 15 ? "is-warn" : value > 0 ? "is-mild" : "is-ok";

  return (
    <span
      className={`ws-em-deficit ws-em-deficit-${size} ${tone}`}
      title="Deficit from 100% target (penalty view)"
    >
      {display}
    </span>
  );
}

function MetricTile({
  label,
  value,
  hint,
  alert = false,
  icon: Icon,
}: {
  label: string;
  value: number;
  hint: string;
  alert?: boolean;
  icon: typeof AlertTriangle;
}) {
  return (
    <div
      className={`ws-sf-metric-tile ws-em-metric-tile${alert && value > 0 ? " is-alert" : ""}`}
    >
      <div className="ws-em-metric-head">
        <Icon size={16} aria-hidden className="ws-em-metric-icon" />
        <span>{label}</span>
      </div>
      <strong className={alert && value > 0 ? "is-late" : undefined}>{value}</strong>
      <span className="ws-stat-card-hint">{hint}</span>
    </div>
  );
}

function EmDoerFilterBar({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  if (options.length <= 1) {
    return null;
  }

  return (
    <div className="ws-task-filter-bar ws-em-doer-filter" aria-label="EM doer filter">
      <div className="ws-em-doer-filter-layout">
        <label className="ws-filter-group">
          <span className="ws-filter-group-label">
            <UserRound size={14} aria-hidden />
            Doer
          </span>
          <div className="ws-filter-select-wrap">
            <select
              aria-label="Filter by doer"
              className="ws-filter-select"
              value={value}
              onChange={(event) => onChange(event.target.value)}
            >
              <option value="">All doers</option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </label>
        {value ? (
          <button
            className="ws-filter-clear ws-filter-clear-inline"
            type="button"
            onClick={() => onChange("")}
          >
            Clear doer
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function EmReadyBoard({ payload }: { payload: EmReadyPayload }) {
  const [doerName, setDoerName] = useState("");

  const when = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(payload.generatedAt));

  const periodTypeLabel =
    payload.period.type === "weekly"
      ? "Weekly EM"
      : payload.period.type === "monthly"
        ? "Monthly review"
        : payload.period.type === "yearly"
          ? "Yearly review"
          : "Custom period review";

  const doerOptions = useMemo(() => {
    const names = new Set<string>();
    for (const row of payload.personKra) {
      if (row.owner !== "Unassigned") {
        names.add(row.owner);
      }
    }
    for (const item of payload.exceptions) {
      if (item.owner !== "Unassigned") {
        names.add(item.owner);
      }
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [payload.exceptions, payload.personKra]);

  const filteredExceptions = useMemo(() => {
    if (!doerName) {
      return payload.exceptions;
    }
    return payload.exceptions.filter((item) => item.owner === doerName);
  }, [doerName, payload.exceptions]);

  const filteredPersonKra = useMemo(() => {
    if (!doerName) {
      return payload.personKra;
    }
    return payload.personKra.filter((row) => row.owner === doerName);
  }, [doerName, payload.personKra]);

  const totalExceptions = doerName
    ? filteredExceptions.length
    : payload.tiles.overdueTasks +
      payload.tiles.overdueFmsStops +
      payload.tiles.unassignedFmsStops;

  return (
    <div className="ws-em-ready">
      <EmDoerFilterBar options={doerOptions} value={doerName} onChange={setDoerName} />

      <section className="ws-em-hero" aria-label="EM Ready overview">
        <div className="ws-em-hero-copy">
          <p className="ws-em-hero-eyebrow">
            <Sparkles size={14} aria-hidden />
            {periodTypeLabel}
          </p>
          <h2>Open and start - zero prep</h2>
          <p>
            {payload.period.periodLabel}. Live data refreshed {when}. Discuss
            exceptions only: overdue FMS stops and delayed tasks
            {KRA_KPI_SURFACE_HIDDEN
              ? "."
              : " — and person-wise KRA deficit — live accountability across tasks, FMS, and PC without compiling tabs first."}
          </p>
        </div>
        <div className="ws-em-hero-stat">
          <span>To discuss</span>
          <strong className={totalExceptions > 0 ? "is-late" : undefined}>
            {totalExceptions}
          </strong>
          <span className="ws-stat-card-hint">exceptions now</span>
        </div>
      </section>

      <div className="ws-sf-metrics ws-em-metrics">
        {payload.tasksEnabled ? (
          <MetricTile
            label="Overdue tasks"
            value={payload.tiles.overdueTasks}
            hint={`${payload.tiles.openTasks} open total`}
            alert
            icon={ListTodo}
          />
        ) : null}
        {payload.fmsEnabled ? (
          <>
            <MetricTile
              label="Overdue FMS stops"
              value={payload.tiles.overdueFmsStops}
              hint="Past planned TAT"
              alert
              icon={GitBranch}
            />
            <MetricTile
              label="Unassigned stops"
              value={payload.tiles.unassignedFmsStops}
              hint="Needs owner"
              alert
              icon={UserRound}
            />
            <MetricTile
              label="Delayed pipelines"
              value={payload.tiles.delayedPipelines}
              hint={`${payload.tiles.activePipelines} active FMS`}
              alert
              icon={Clock}
            />
          </>
        ) : null}
      </div>

      {(payload.taskSummary || payload.fmsSummary) && (
        <section className="ws-em-section ws-em-module-section" aria-label="Module deficit summary">
          <header className="ws-fms-section-heading">
            <h2>Module deficit</h2>
            <p>Penalty view - gap from 100%, not &ldquo;% done&rdquo;.</p>
          </header>
          <div className="ws-em-module-grid">
            {payload.taskSummary ? (
              <article className="ws-sf-card ws-em-module-card">
                <div className="ws-em-module-top">
                  <ListTodo size={18} aria-hidden />
                  <span>Tasks</span>
                </div>
                <DeficitBadge value={payload.taskSummary.deficitPct} size="lg" />
                <p>
                  {payload.taskSummary.delayed} delayed of {payload.taskSummary.total}{" "}
                  open
                </p>
                <Link
                  href="/app/reports?category=task&metric=delayed"
                  className="ws-em-link"
                >
                  Drill down
                  <ChevronRight size={14} aria-hidden />
                </Link>
              </article>
            ) : null}
            {payload.fmsSummary ? (
              <article className="ws-sf-card ws-em-module-card">
                <div className="ws-em-module-top">
                  <GitBranch size={18} aria-hidden />
                  <span>FMS</span>
                </div>
                <DeficitBadge value={payload.fmsSummary.deficitPct} size="lg" />
                <p>
                  {payload.fmsSummary.delayed} delayed of {payload.fmsSummary.total}{" "}
                  active
                </p>
                <Link href="/app/fms/lines" className="ws-em-link">
                  Live pipelines
                  <ChevronRight size={14} aria-hidden />
                </Link>
              </article>
            ) : null}
          </div>
        </section>
      )}

      <div className="ws-em-split">
        <section
          className="ws-sf-list-view ws-em-section ws-em-section-primary"
          aria-label="Exceptions for discussion"
        >
          <header className="ws-sf-list-view-header">
            <div className="ws-sf-list-view-title">
              <h2>
                <AlertTriangle size={18} aria-hidden />
                Discuss first
              </h2>
              <span className="ws-sf-list-view-count">
                {filteredExceptions.length} item
                {filteredExceptions.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="ws-em-section-lead">
              Overdue FMS stops and tasks for {payload.period.periodLabel}
              {doerName ? ` - ${doerName}` : ""}.
            </p>
          </header>
          {filteredExceptions.length === 0 ? (
            <div className="ws-empty-state ws-fms-empty-state is-positive">
              <p>
                {doerName
                  ? `No exceptions for ${doerName} in this period.`
                  : "All pipelines on track. Nothing blocking EM today."}
              </p>
            </div>
          ) : (
            <ul className="ws-em-exception-list">
              {filteredExceptions.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <Link href={item.href} className="ws-em-exception-item">
                    <span className={`ws-em-kind ws-em-kind-${item.kind}`}>
                      {item.kind === "fms"
                        ? "FMS"
                        : item.kind === "checklist"
                          ? "PC"
                          : "Task"}
                    </span>
                    <div className="ws-em-exception-body">
                      <strong>{item.title}</strong>
                      <span>
                        {item.owner} - {item.detail}
                      </span>
                    </div>
                    <ChevronRight
                      size={18}
                      aria-hidden
                      className="ws-em-exception-chevron"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {KRA_KPI_SURFACE_HIDDEN ? null : payload.personKra.length > 0 ? (
          <section
            className="ws-sf-list-view ws-em-section"
            aria-label="Person-wise KRA"
          >
            <header className="ws-sf-list-view-header">
              <div className="ws-sf-list-view-title">
                <h2>
                  <Users size={18} aria-hidden />
                  Person-wise KRA
                </h2>
                <span className="ws-sf-list-view-count">
                  {filteredPersonKra.length} people
                </span>
              </div>
              <p className="ws-em-section-lead">
                Tasks + FMS combined deficit per team member
                {doerName ? ` - ${doerName}` : ""}.
              </p>
            </header>
            <div className="ws-sf-table-wrap ws-em-table-wrap">
              <table className="ws-fms-data-table ws-sf-data-table ws-em-kra-table">
                <thead>
                  <tr>
                    <th>Person</th>
                    <th className="ws-mis-col-num">Tasks</th>
                    <th className="ws-mis-col-num">FMS</th>
                    <th className="ws-mis-col-num">PC</th>
                    <th className="ws-mis-col-num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPersonKra.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="ws-fms-muted">
                        No KRA rows for this doer.
                      </td>
                    </tr>
                  ) : (
                    filteredPersonKra.map((row) => (
                      <tr key={row.owner}>
                        <td className="ws-em-person-cell">{row.owner}</td>
                        <td className="ws-mis-col-num">
                          {row.taskTotal > 0 ? (
                            <div className="ws-em-kra-cell">
                              <DeficitBadge value={row.taskDeficitPct} size="sm" />
                              <span className="ws-em-sub">
                                {row.taskDelayed}/{row.taskTotal} delayed
                              </span>
                            </div>
                          ) : (
                            <span className="ws-fms-muted">-</span>
                          )}
                        </td>
                        <td className="ws-mis-col-num">
                          {row.fmsTotal > 0 ? (
                            <div className="ws-em-kra-cell">
                              <DeficitBadge value={row.fmsDeficitPct} size="sm" />
                              <span className="ws-em-sub">
                                {row.fmsDelayed}/{row.fmsTotal} delayed
                              </span>
                            </div>
                          ) : (
                            <span className="ws-fms-muted">-</span>
                          )}
                        </td>
                        <td className="ws-mis-col-num">
                          {row.checklistTotal > 0 ? (
                            <div className="ws-em-kra-cell">
                              <DeficitBadge value={row.checklistDeficitPct} size="sm" />
                              <span className="ws-em-sub">
                                {row.checklistDelayed}/{row.checklistTotal} delayed
                              </span>
                            </div>
                          ) : (
                            <span className="ws-fms-muted">-</span>
                          )}
                        </td>
                        <td className="ws-mis-col-num">
                          <DeficitBadge value={row.totalDeficitPct} size="sm" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>

      <footer className="ws-em-footer">
        <p className="ws-em-footer-note">
          Tip: run EM from this board, then jump to pipelines for live job detail.
        </p>
        <div className="ws-em-actions">
          {payload.fmsEnabled ? (
            <Link href="/app/fms/ops" className="btn-secondary btn-sm">
              FMS ops monitor
            </Link>
          ) : null}
          {payload.fmsEnabled ? (
            <Link href="/app/fms/lines" className="btn-primary btn-sm ws-sf-btn-primary">
              Live pipelines
            </Link>
          ) : null}
          {payload.tasksEnabled ? (
            <Link href="/app/tasks" className="btn-secondary btn-sm">
              Task board
            </Link>
          ) : null}
          <Link href="/app/reports" className="btn-secondary btn-sm">
            Full MIS reports
          </Link>
        </div>
      </footer>
    </div>
  );
}
