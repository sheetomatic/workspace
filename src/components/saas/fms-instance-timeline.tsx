import type { FmsStepStatus } from "@prisma/client";
import { FmsStatusBadge } from "@/components/saas/fms-status-badge";
import {
  formatDelayLabel,
  isStepOverdue,
  liveDelayMinutes,
} from "@/lib/fms/step-display";

type TimelineStep = {
  id: string;
  status: FmsStepStatus;
  plannedAt: Date | null;
  actualAt: Date | null;
  delayMinutes: number | null;
  notes: string | null;
  step: {
    stepName: string;
    roleLabel: string | null;
  };
  owner: { name: string | null; email: string } | null;
  completedBy: { name: string | null } | null;
  attachments: { id: string; fileName: string; fileSize: number }[];
};

function formatDate(value: Date | null) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function statusClass(status: FmsStepStatus, overdue: boolean, doneLate: boolean) {
  if (status === "DONE") {
    return doneLate ? "is-late" : "is-done";
  }
  if (status === "IN_PROGRESS") {
    return overdue ? "is-overdue" : "is-active";
  }
  return "is-pending";
}

export function FmsInstanceTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="ws-fms-timeline">
      {steps.map((step, index) => {
        const ownerName =
          step.owner?.name ?? step.owner?.email.split("@")[0] ?? "Unassigned";
        const delay = liveDelayMinutes(
          step.plannedAt,
          step.actualAt,
          step.delayMinutes,
        );
        const delayLabel = formatDelayLabel(delay);
        const overdue = isStepOverdue(
          step.status,
          step.plannedAt,
          step.actualAt,
          step.delayMinutes,
        );
        const doneLate = step.status === "DONE" && Boolean(delay && delay > 0);
        const stepClass = statusClass(step.status, overdue, doneLate);

        return (
          <article
            key={step.id}
            className={`ws-fms-timeline-step ${stepClass}`}
          >
            <div className="ws-fms-timeline-marker" aria-hidden>
              {index + 1}
            </div>
            <div className="ws-fms-timeline-body">
              <header>
                <div className="ws-fms-timeline-title">
                  <h4>{step.step.stepName}</h4>
                  {step.step.roleLabel ? (
                    <span className="ws-fms-muted">{step.step.roleLabel}</span>
                  ) : null}
                </div>
                <div className="ws-fms-timeline-badges">
                  <FmsStatusBadge status={step.status} />
                  {delayLabel && (overdue || doneLate) ? (
                    <span className="ws-sf-badge ws-sf-badge-danger">{delayLabel}</span>
                  ) : null}
                  {step.status === "IN_PROGRESS" &&
                  step.plannedAt &&
                  !overdue ? (
                    <span className="ws-sf-badge ws-sf-badge-info">On track</span>
                  ) : null}
                </div>
              </header>
              <dl className="ws-fms-timeline-meta">
                <div>
                  <dt>Owner</dt>
                  <dd>{ownerName}</dd>
                </div>
                <div>
                  <dt>Planned</dt>
                  <dd>{formatDate(step.plannedAt)}</dd>
                </div>
                <div>
                  <dt>Actual</dt>
                  <dd>{formatDate(step.actualAt)}</dd>
                </div>
                <div>
                  <dt>Delay</dt>
                  <dd>{delayLabel ?? (step.status === "PENDING" ? "-" : "None")}</dd>
                </div>
              </dl>
              {step.notes ? <p className="ws-fms-notes">{step.notes}</p> : null}
              {step.completedBy?.name ? (
                <p className="ws-fms-muted">Completed by {step.completedBy.name}</p>
              ) : null}
              {step.attachments.length > 0 ? (
                <ul className="ws-fms-attachments">
                  {step.attachments.map((file) => (
                    <li key={file.id}>
                      {file.fileName} ({Math.round(file.fileSize / 1024)} KB)
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
