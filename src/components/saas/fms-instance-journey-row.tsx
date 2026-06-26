"use client";

import type { FmsFormFieldType, FmsInstanceStatus, FmsStepStatus } from "@prisma/client";
import { CheckCircle2, Clock, FileInput } from "lucide-react";
import { FmsStatusBadge } from "@/components/saas/fms-status-badge";
import type { FmsStepCompleteState } from "@/components/saas/fms-step-complete-panel";
import { FmsStepActionBar } from "@/components/saas/fms-step-action-bar";
import { renderFmsFieldValue } from "@/lib/fms/display-values";
import {
  computeStepUrgency,
  formatDelayLabel,
  isStepOverdue,
  liveDelayMinutes,
  urgencyClassName,
} from "@/lib/fms/step-display";

export type JourneyFormField = {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: FmsFormFieldType;
  options?: unknown;
};

export type JourneyStep = {
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

function displayValue(
  value: unknown,
  fieldType: FmsFormFieldType,
  options?: unknown,
) {
  return renderFmsFieldValue(value, fieldType, options);
}

function stepStateClass(
  status: FmsStepStatus,
  overdue: boolean,
  doneLate: boolean,
) {
  if (status === "DONE") {
    return doneLate ? "is-late" : "is-done";
  }
  if (status === "IN_PROGRESS") {
    return overdue ? "is-overdue is-stuck" : "is-active is-stuck";
  }
  if (status === "SKIPPED") {
    return "is-skipped";
  }
  return "is-pending";
}

function connectorClass(
  fromStatus: "lead" | FmsStepStatus,
  toStatus: FmsStepStatus,
  toOverdue: boolean,
  toDoneLate: boolean,
) {
  if (fromStatus === "lead" || fromStatus === "DONE") {
    if (fromStatus === "DONE" && toStatus === "DONE" && toDoneLate) {
      return "is-late";
    }
    if (fromStatus === "lead" || fromStatus === "DONE") {
      if (toStatus === "IN_PROGRESS") {
        return "is-active";
      }
      if (toStatus === "DONE") {
        return toDoneLate ? "is-late" : "is-done";
      }
      if (toStatus === "PENDING") {
        return "is-pending";
      }
    }
    return "is-done";
  }
  if (fromStatus === "IN_PROGRESS") {
    return toOverdue ? "is-stuck" : "is-active";
  }
  return "is-pending";
}

type FmsInstanceJourneyRowProps = {
  leadLabel: string;
  formName: string;
  formFields: JourneyFormField[];
  submissionValues: Record<string, unknown>;
  submittedAt: Date | null;
  instanceStatus: FmsInstanceStatus;
  steps: JourneyStep[];
  completePanel?: {
    stepState: FmsStepCompleteState;
    canComplete: boolean;
    quickComplete?: boolean;
  } | null;
};

export function FmsInstanceJourneyRow({
  leadLabel,
  formName,
  formFields,
  submissionValues,
  submittedAt,
  instanceStatus,
  steps,
  completePanel,
}: FmsInstanceJourneyRowProps) {
  const allDone =
    steps.length > 0 && steps.every((step) => step.status === "DONE");
  const completedCount = steps.filter((step) => step.status === "DONE").length;
  const activeCompleteStep = completePanel
    ? steps.find((step) => step.id === completePanel.stepState.id)
    : null;
  const focusStop = Boolean(completePanel?.canComplete);

  return (
    <>
    <div className={`ws-fms-journey-row${focusStop ? " is-focus-stop" : ""}`}>
      <details className="ws-fms-journey-pipeline" open={!focusStop}>
        <summary className="ws-fms-journey-pipeline-summary">
          <span>
            Pipeline · {completedCount}/{steps.length} stops passed
          </span>
        </summary>
      <p className="ws-fms-journey-row-hint">
        Lead form filled - FMS flow started. Each column is one stop on the route.
      </p>

      <div
        className="ws-fms-journey-row-track"
        role="list"
        aria-label={`${leadLabel} journey, ${completedCount} of ${steps.length} stops passed`}
      >
        <article className="ws-fms-journey-row-node is-lead is-done" role="listitem">
          <div className="ws-fms-journey-row-marker" aria-hidden>
            <FileInput size={16} />
          </div>
          <div className="ws-fms-journey-row-card">
            <header className="ws-fms-journey-row-card-head">
              <div>
                <p className="ws-fms-journey-row-eyebrow">Lead</p>
                <h3>{leadLabel}</h3>
                <p className="ws-fms-muted">{formName}</p>
              </div>
              <span className="ws-fms-journey-row-pill is-done">Form filled</span>
            </header>
            <div className="ws-fms-journey-row-card-body">
              <dl className="ws-fms-journey-row-fields">
                {formFields.map((field) => (
                  <div key={field.id}>
                    <dt>{field.label}</dt>
                    <dd>
                      {displayValue(
                        submissionValues[field.fieldKey],
                        field.fieldType,
                        field.options,
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              {submittedAt ? (
                <p className="ws-fms-journey-row-foot">
                  Submitted {formatDate(submittedAt)}
                </p>
              ) : null}
            </div>
          </div>
        </article>

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
          const stateClass = [
            stepStateClass(step.status, overdue, doneLate),
            urgencyClass,
          ]
            .filter(Boolean)
            .join(" ");
          const isStuck = step.status === "IN_PROGRESS";
          const showClock =
            step.status === "IN_PROGRESS" &&
            step.plannedAt &&
            (urgency === "same-day" || urgency === "overdue");
          const prevStatus = index === 0 ? "lead" : steps[index - 1]!.status;
          const wireClass = connectorClass(
            prevStatus,
            step.status,
            overdue,
            doneLate,
          );

          return (
            <article
              key={step.id}
              className={`ws-fms-journey-row-node ${stateClass}`}
              role="listitem"
            >
              <span
                className={`ws-fms-journey-row-wire ${wireClass}`}
                aria-hidden
              />
              <div className="ws-fms-journey-row-marker" aria-hidden>
                {showClock ? (
                  <Clock
                    size={16}
                    className={`ws-fms-urgency-clock${urgency === "overdue" ? " is-pulsing" : ""}`}
                  />
                ) : (
                  index + 1
                )}
              </div>
              <div className="ws-fms-journey-row-card">
                {isStuck ? (
                  <p
                    className={`ws-fms-journey-row-stuck${overdue ? " is-overdue" : ""}`}
                  >
                    {overdue && delayLabel ? delayLabel : "Stopped here"}
                  </p>
                ) : null}
                <header className="ws-fms-journey-row-card-head">
                  <div>
                    <p className="ws-fms-journey-row-eyebrow">Step {index + 1}</p>
                    <h3>{step.step.stepName}</h3>
                    {step.step.roleLabel ? (
                      <p className="ws-fms-muted">{step.step.roleLabel}</p>
                    ) : null}
                  </div>
                  <FmsStatusBadge status={step.status} />
                </header>
                <div className="ws-fms-journey-row-card-body">
                  <dl className="ws-fms-journey-row-meta">
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
                  {delayLabel && (overdue || doneLate) ? (
                    <span className="ws-sf-badge ws-sf-badge-danger ws-fms-journey-row-delay">
                      {delayLabel}
                    </span>
                  ) : null}
                  {step.status === "IN_PROGRESS" && step.plannedAt && !overdue ? (
                    <span className="ws-sf-badge ws-sf-badge-info ws-fms-journey-row-delay">
                      On track
                    </span>
                  ) : null}
                  {step.notes ? <p className="ws-fms-notes">{step.notes}</p> : null}
                  {step.completedBy?.name ? (
                    <p className="ws-fms-muted ws-fms-journey-row-foot">
                      Completed by {step.completedBy.name}
                    </p>
                  ) : null}
                  {step.attachments.length > 0 ? (
                    <ul className="ws-fms-journey-attachments">
                      {step.attachments.map((file) => (
                        <li key={file.id} className="ws-fms-journey-attachment-item">
                          <a
                            className="ws-fms-journey-attachment-link"
                            href={`/api/fms/attachments/${file.id}`}
                            rel="noreferrer"
                            target="_blank"
                            title={file.fileName}
                          >
                            {file.fileName}
                          </a>
                          <span className="ws-fms-journey-attachment-size">
                            {Math.round(file.fileSize / 1024)} KB
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}

        <div
          className={`ws-fms-journey-row-end${allDone || instanceStatus === "COMPLETED" ? " is-reached" : ""}`}
          aria-hidden
        >
          {steps.length > 0 ? (
            <span
              className={`ws-fms-journey-row-wire ${allDone || instanceStatus === "COMPLETED" ? "is-done" : "is-pending"}`}
            />
          ) : null}
          <div className="ws-fms-journey-row-marker is-end">
            {allDone || instanceStatus === "COMPLETED" ? (
              <CheckCircle2 size={16} />
            ) : (
              "End"
            )}
          </div>
          <span className="ws-fms-journey-row-end-label">Complete</span>
        </div>
      </div>
      </details>

      {activeCompleteStep?.status === "IN_PROGRESS" && completePanel ? (
        <FmsStepActionBar
          accountability={{
            doerName:
              activeCompleteStep.owner?.name ??
              activeCompleteStep.owner?.email.split("@")[0] ??
              "Unassigned",
            delayLabel: formatDelayLabel(
              liveDelayMinutes(
                activeCompleteStep.plannedAt,
                activeCompleteStep.actualAt,
                activeCompleteStep.delayMinutes,
              ),
            ),
            isOverdue: isStepOverdue(
              activeCompleteStep.status,
              activeCompleteStep.plannedAt,
              activeCompleteStep.actualAt,
              activeCompleteStep.delayMinutes,
            ),
            plannedAt: activeCompleteStep.plannedAt,
          }}
          canComplete={completePanel.canComplete}
          existingAttachments={activeCompleteStep.attachments}
          initialNotes={activeCompleteStep.notes}
          stepName={activeCompleteStep.step.stepName}
          stepState={completePanel.stepState}
          quickComplete={completePanel.quickComplete}
        />
      ) : null}
    </div>
    </>
  );
}
