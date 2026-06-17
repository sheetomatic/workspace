"use client";

import { useState } from "react";
import type { FmsStepStatus } from "@prisma/client";
import { CheckCircle2, Clock } from "lucide-react";
import { FmsStatusBadge } from "@/components/saas/fms-status-badge";
import {
  FmsStepCompletePanel,
  type FmsStepCompleteState,
} from "@/components/saas/fms-step-complete-panel";
import {
  computeStepUrgency,
  formatDelayLabel,
  isStepOverdue,
  liveDelayMinutes,
  urgencyClassName,
} from "@/lib/fms/step-display";

export type TimelineStep = {
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
    return overdue ? "is-overdue is-stuck" : "is-active is-stuck";
  }
  return "is-pending";
}

export function FmsInstanceTimeline({
  steps,
  completePanel,
}: {
  steps: TimelineStep[];
  completePanel?: {
    stepState: FmsStepCompleteState;
    canComplete: boolean;
  } | null;
}) {
  const [formOpenForStepId, setFormOpenForStepId] = useState<string | null>(null);

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
        const urgency = computeStepUrgency(step.status, step.plannedAt);
        const urgencyClass = urgencyClassName(urgency);
        const stepClass = [statusClass(step.status, overdue, doneLate), urgencyClass]
          .filter(Boolean)
          .join(" ");
        const showClock =
          step.status === "IN_PROGRESS" &&
          step.plannedAt &&
          (urgency === "same-day" || urgency === "overdue");
        const isStuck = step.status === "IN_PROGRESS";
        const showCompleteForm =
          formOpenForStepId === step.id &&
          completePanel?.stepState.id === step.id;

        return (
          <article
            key={step.id}
            className={`ws-fms-timeline-step ${stepClass}`}
          >
            <div className="ws-fms-timeline-marker" aria-hidden>
              {showClock ? (
                <Clock
                  size={16}
                  className={`ws-fms-urgency-clock${urgency === "overdue" ? " is-pulsing" : ""}`}
                />
              ) : (
                index + 1
              )}
            </div>
            <div className="ws-fms-timeline-body">
              {isStuck ? (
                <p className="ws-fms-timeline-stuck-label">Stopped here</p>
              ) : null}
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
                  {step.status === "IN_PROGRESS" && step.plannedAt && !overdue ? (
                    <span className="ws-sf-badge ws-sf-badge-info">On track</span>
                  ) : null}
                </div>
              </header>
              <dl className="ws-fms-timeline-meta">
                <div>
                  <dt>Doer</dt>
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

              {isStuck && completePanel?.stepState.id === step.id ? (
                <div className="ws-fms-timeline-actions">
                  {!showCompleteForm && completePanel.canComplete ? (
                    <button
                      className="btn-primary ws-sf-btn-primary ws-fms-mark-done-btn"
                      type="button"
                      onClick={() => setFormOpenForStepId(step.id)}
                    >
                      <CheckCircle2 aria-hidden size={16} />
                      Mark done
                    </button>
                  ) : null}
                  {!showCompleteForm && !completePanel.canComplete ? (
                    <p className="ws-fms-muted ws-fms-timeline-wait-msg">
                      {!completePanel.stepState.ownerUserId
                        ? "No doer assigned. Ask a manager to reassign this stop."
                        : "Only the assigned doer can mark this stop done."}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {showCompleteForm && completePanel ? (
                <FmsStepCompletePanel
                  canComplete={completePanel.canComplete}
                  mode="form"
                  stepState={completePanel.stepState}
                  onCancel={() => setFormOpenForStepId(null)}
                />
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
