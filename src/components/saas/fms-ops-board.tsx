import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  GitBranch,
  Radar,
  UserRound,
  Users,
} from "lucide-react";
import { FmsPagination } from "@/components/saas/fms-pagination";
import { FmsRecentActivity } from "@/components/saas/fms-recent-activity";
import type { FmsNotificationHealth } from "@/lib/fms/notification-health";
import { fmsInstanceHref } from "@/lib/fms/navigation";
import type { getFmsOpsPage, getFmsPipelineCounts } from "@/lib/fms/queries";
import {
  formatDelayLabel,
  isStepOverdue,
  liveDelayMinutes,
} from "@/lib/fms/step-display";

type PipelineCounts = Awaited<ReturnType<typeof getFmsPipelineCounts>>;
type OpsPage = Awaited<ReturnType<typeof getFmsOpsPage>>;

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
      className={`ws-sf-metric-tile ws-fms-ops-metric${alert && value > 0 ? " is-alert" : ""}`}
    >
      <div className="ws-fms-ops-metric-head">
        <Icon size={16} aria-hidden className="ws-fms-ops-metric-icon" />
        <span>{label}</span>
      </div>
      <strong className={alert && value > 0 ? "is-late" : undefined}>{value}</strong>
      <span className="ws-stat-card-hint">{hint}</span>
    </div>
  );
}

function formatWhen(iso: string | null) {
  if (!iso) {
    return "Not yet run";
  }
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function AlertsHealthPanel({ health }: { health: FmsNotificationHealth }) {
  const issues: string[] = [];

  if (!health.cronSecretConfigured) {
    issues.push("Scheduled reminders are not configured on the server.");
  }
  if (!health.lastFmsReminderRun) {
    issues.push("Daily FMS reminder has not run yet.");
  } else if (health.lastFmsReminderOk === false) {
    issues.push(`Last reminder run failed: ${health.lastFmsReminderSummary ?? "unknown"}`);
  }
  if (!health.whatsappReady) {
    issues.push("WhatsApp nudges are not fully connected.");
  }
  if (!health.emailConfigured) {
    issues.push("Email alerts are not configured.");
  }
  if (health.unassignedActiveSteps > 0) {
    issues.push(
      `${health.unassignedActiveSteps} stop(s) have no owner - assign before EM.`,
    );
  }
  if (health.inProgressWithoutPhone > 0) {
    issues.push(
      `${health.inProgressWithoutPhone} doer(s) missing phone - WhatsApp will skip them.`,
    );
  }

  const healthy = issues.length === 0;

  return (
    <details className="ws-fms-ops-alerts-panel">
      <summary>
        <Bell size={16} aria-hidden />
        <span>
          <strong>Step alerts</strong>
          <small>WhatsApp nudges, email, daily reminders</small>
        </span>
        <span className={`ws-fms-ops-alerts-pill${healthy ? " is-ok" : " is-warn"}`}>
          {healthy ? "Healthy" : `${issues.length} note${issues.length === 1 ? "" : "s"}`}
        </span>
      </summary>
      <div className="ws-fms-ops-alerts-body">
        <dl className="ws-fms-ops-alerts-grid">
          <div>
            <dt>Last reminder</dt>
            <dd>{formatWhen(health.lastFmsReminderRun)}</dd>
          </div>
          <div>
            <dt>Reminder status</dt>
            <dd>
              {health.lastFmsReminderOk == null
                ? "Unknown"
                : health.lastFmsReminderOk
                  ? "OK"
                  : "Failed"}
            </dd>
          </div>
          <div>
            <dt>WhatsApp</dt>
            <dd>{health.whatsappReady ? "Ready" : "Needs setup"}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{health.emailConfigured ? "Ready" : "Not set"}</dd>
          </div>
        </dl>
        {healthy ? (
          <p className="ws-fms-ops-alerts-ok">
            <CheckCircle2 size={16} aria-hidden />
            Your team will get nudges when a stop goes overdue.
          </p>
        ) : (
          <ul className="ws-fms-ops-alerts-issues">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

export function FmsOpsBoard({
  pipelineCounts,
  ops,
  notifyHealth,
  recentActivity,
  searchParams,
}: {
  pipelineCounts: PipelineCounts;
  ops: OpsPage;
  notifyHealth: FmsNotificationHealth;
  recentActivity: Parameters<typeof FmsRecentActivity>[0]["events"];
  searchParams: { overduePage?: string; unassignedPage?: string };
}) {
  const blockers = ops.overdueTotal + ops.unassignedTotal;

  return (
    <div className="ws-fms-ops-board">
      <section className="ws-fms-ops-hero" aria-label="Ops monitor overview">
        <div className="ws-fms-ops-hero-copy">
          <p className="ws-fms-ops-hero-eyebrow">
            <Radar size={14} aria-hidden />
            Accountability monitor
          </p>
          <h2>WHO is late - before the blame game</h2>
          <p>
            Planned vs actual vs delay for every active FMS stop. Use this view
            between weekly EMs to chase overdue work and fix unassigned owners.
          </p>
        </div>
        <div className="ws-fms-ops-hero-stat">
          <span>Needs action</span>
          <strong className={blockers > 0 ? "is-late" : undefined}>{blockers}</strong>
          <span className="ws-stat-card-hint">overdue + unassigned</span>
        </div>
      </section>

      <div className="ws-sf-metrics ws-fms-ops-metrics">
        <MetricTile
          label="Active FMS"
          value={pipelineCounts.active}
          hint="Running now"
          icon={GitBranch}
        />
        <MetricTile
          label="On track"
          value={pipelineCounts.onTrack}
          hint={pipelineCounts.onTrack > 0 ? "Current stop on time" : "None yet"}
          icon={CheckCircle2}
        />
        <MetricTile
          label="Delayed"
          value={pipelineCounts.delayed}
          hint={pipelineCounts.delayed > 0 ? "Past TAT" : "None overdue"}
          alert
          icon={Clock}
        />
        <MetricTile
          label="Overdue stops"
          value={ops.overdueTotal}
          hint="Discuss in EM first"
          alert
          icon={AlertTriangle}
        />
      </div>

      <AlertsHealthPanel health={notifyHealth} />

      <div className="ws-fms-ops-split">
        <section
          className="ws-sf-list-view ws-fms-ops-section ws-fms-ops-section-alert"
          aria-label="Overdue stops"
        >
          <header className="ws-sf-list-view-header">
            <div className="ws-sf-list-view-title">
              <h2>
                <AlertTriangle size={18} aria-hidden />
                Overdue stops
              </h2>
              <span className="ws-sf-list-view-count">
                {ops.overdueTotal} item{ops.overdueTotal === 1 ? "" : "s"}
              </span>
            </div>
            <p className="ws-fms-ops-section-lead">
              Past planned TAT - open the job, mark done, or reassign the owner.
            </p>
          </header>
          {ops.overdue.length === 0 ? (
            <div className="ws-empty-state ws-fms-empty-state is-positive">
              <p>All active stops are on track. Nothing to chase today.</p>
            </div>
          ) : (
            <>
              <ul className="ws-fms-ops-exception-list">
                {ops.overdue.map((stepState) => {
                  const delay = liveDelayMinutes(
                    stepState.plannedAt,
                    stepState.actualAt,
                    stepState.delayMinutes,
                  );
                  const owner =
                    stepState.owner?.name ??
                    stepState.owner?.email.split("@")[0] ??
                    "Unassigned";
                  const line =
                    stepState.instance.referenceLabel ??
                    stepState.instance.template.name;

                  return (
                    <li key={stepState.id}>
                      <Link
                        href={fmsInstanceHref(stepState.instanceId, "ops", undefined, "complete")}
                        className="ws-fms-ops-exception-item"
                      >
                        <span className="ws-fms-ops-delay-badge">
                          {formatDelayLabel(delay) ?? "Overdue"}
                        </span>
                        <div className="ws-fms-ops-exception-body">
                          <strong>{line}</strong>
                          <span>
                            {stepState.step.stepName} - {owner}
                          </span>
                          <span className="ws-fms-ops-workflow">
                            {stepState.instance.template.name}
                          </span>
                        </div>
                        <ChevronRight
                          size={18}
                          aria-hidden
                          className="ws-fms-ops-exception-chevron"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <FmsPagination
                page={ops.overduePage}
                totalPages={ops.overdueTotalPages}
                total={ops.overdueTotal}
                searchParams={searchParams}
                basePath="/app/fms/ops"
                pageParam="overduePage"
                label="overdue stops"
              />
            </>
          )}
        </section>

        <section
          className="ws-sf-list-view ws-fms-ops-section"
          aria-label="Unassigned stops"
        >
          <header className="ws-sf-list-view-header">
            <div className="ws-sf-list-view-title">
              <h2>
                <UserRound size={18} aria-hidden />
                Unassigned stops
              </h2>
              <span className="ws-sf-list-view-count">
                {ops.unassignedTotal} item{ops.unassignedTotal === 1 ? "" : "s"}
              </span>
            </div>
            <p className="ws-fms-ops-section-lead">
              No owner means no accountability - assign WHO before the stop slips.
            </p>
          </header>
          {ops.unassigned.length === 0 ? (
            <div className="ws-empty-state ws-fms-empty-state is-positive">
              <p>Every active stop has an owner. Good for weekly EM.</p>
            </div>
          ) : (
            <>
              <ul className="ws-fms-ops-exception-list">
                {ops.unassigned.map((stepState) => {
                  const overdue = isStepOverdue(
                    stepState.status,
                    stepState.plannedAt,
                    stepState.actualAt,
                    stepState.delayMinutes,
                  );
                  const line =
                    stepState.instance.referenceLabel ??
                    stepState.instance.template.name;

                  return (
                    <li key={stepState.id}>
                      <Link
                        href={fmsInstanceHref(stepState.instanceId, "ops")}
                        className="ws-fms-ops-exception-item"
                      >
                        <span
                          className={`ws-fms-ops-owner-badge${overdue ? " is-late" : ""}`}
                        >
                          {overdue ? "Overdue" : "No owner"}
                        </span>
                        <div className="ws-fms-ops-exception-body">
                          <strong>{line}</strong>
                          <span>{stepState.step.stepName}</span>
                        </div>
                        <ChevronRight
                          size={18}
                          aria-hidden
                          className="ws-fms-ops-exception-chevron"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <FmsPagination
                page={ops.unassignedPage}
                totalPages={ops.unassignedTotalPages}
                total={ops.unassignedTotal}
                searchParams={searchParams}
                basePath="/app/fms/ops"
                pageParam="unassignedPage"
                label="unassigned stops"
              />
            </>
          )}
        </section>
      </div>

      <section className="ws-fms-ops-activity-wrap" aria-label="Recent FMS activity">
        <header className="ws-fms-section-heading ws-fms-ops-activity-head">
          <h2>
            <Users size={18} aria-hidden />
            Recent movement
          </h2>
          <p>Who completed, reassigned, or submitted - audit trail for EM.</p>
        </header>
        <FmsRecentActivity events={recentActivity} />
      </section>

      <footer className="ws-fms-ops-footer">
        <p className="ws-fms-ops-footer-note">
          Tip: open EM Ready for person-wise KRA deficit, then return here to chase stops.
        </p>
        <div className="ws-fms-ops-actions">
          <Link href="/app/em" className="btn-secondary btn-sm">
            EM Ready board
          </Link>
          <Link href="/app/fms/lines" className="btn-primary btn-sm ws-sf-btn-primary">
            Live pipelines
          </Link>
          <Link href="/app/fms/scores" className="btn-secondary btn-sm">
            MIS scores
          </Link>
        </div>
      </footer>
    </div>
  );
}
