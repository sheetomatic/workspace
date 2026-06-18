"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { FileInput } from "lucide-react";
import type { FmsStepStatus } from "@prisma/client";
import { FmsStatusBadge } from "@/components/saas/fms-status-badge";
import { FmsStepManagePopover } from "@/components/saas/fms-step-manage-popover";
import { FmsStepTaskModal } from "@/components/saas/fms-step-task-modal";
import { FmsTrackerRowDetail } from "@/components/saas/fms-tracker-row-detail";
import { FmsTrainRouteSnapshot } from "@/components/saas/fms-train-route-snapshot";
import type { FmsStepManageMeta } from "@/components/saas/fms-step-info-modal";
import type { FmsStepCompleteState } from "@/components/saas/fms-step-complete-panel";
import type { FmsSlaConfig } from "@/lib/fms/constants";
import { fmsFormHref, fmsInstanceHref, type FmsFromContext } from "@/lib/fms/navigation";
import {
  formatDelayLabel,
  isStepOverdue,
  liveDelayMinutes,
} from "@/lib/fms/step-display";

export type TrackerTableBlock = {
  id: string;
  name: string;
  form: {
    id: string;
    fields: {
      id: string;
      fieldKey: string;
      label: string;
      fieldType: string;
    }[];
  };
  steps: {
    id: string;
    stepName: string;
    roleLabel: string | null;
    instructions: string | null;
    slaType: FmsStepManageMeta["slaType"];
    slaConfig: unknown;
    allowMarkDone: boolean;
    allowUpload: boolean;
    allowNotes: boolean;
    captureFields: unknown;
    defaultOwner: { name: string | null; email: string } | null;
  }[];
  instances: {
    id: string;
    referenceLabel: string | null;
    submission: { values: unknown } | null;
    stepStates: {
      id: string;
      stepId: string;
      status: FmsStepStatus;
      plannedAt: string | null;
      actualAt: string | null;
      delayMinutes: number | null;
      ownerUserId: string | null;
      owner: { id: string; name: string | null; email: string } | null;
    }[];
  }[];
};

type ActiveTask = {
  meta: FmsStepManageMeta;
  stepState: FmsStepCompleteState;
  canComplete: boolean;
};

function displayValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return String(value);
}

function formatCellDate(value: string | null) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function leadColumns(fields: TrackerTableBlock["form"]["fields"]) {
  return fields
    .filter(
      (field) =>
        field.fieldType !== "FILE" &&
        !/timestamp/i.test(field.label) &&
        !/timestamp/i.test(field.fieldKey),
    )
    .slice(0, 4);
}

function stepMeta(
  block: TrackerTableBlock,
  step: TrackerTableBlock["steps"][number],
  index: number,
  ownerName?: string | null,
): FmsStepManageMeta {
  return {
    stepName: step.stepName,
    instructions: step.instructions,
    roleLabel: step.roleLabel,
    whoName:
      ownerName ??
      step.defaultOwner?.name ??
      step.defaultOwner?.email.split("@")[0] ??
      null,
    slaType: step.slaType,
    slaConfig: (step.slaConfig ?? {}) as FmsSlaConfig,
    formId: block.form.id,
    stepIndex: index,
  };
}

function rowColSpan(columnCount: number, stepCount: number) {
  return 1 + columnCount + 1 + stepCount * 4;
}

export function FmsMasterTrackerTable({
  block,
  viewerUserId,
  showEditLink = true,
  returnContext = "lines",
  returnTemplateId,
}: {
  block: TrackerTableBlock;
  viewerUserId?: string;
  showEditLink?: boolean;
  returnContext?: FmsFromContext;
  returnTemplateId?: string;
}) {
  const columns = useMemo(() => leadColumns(block.form.fields), [block.form.fields]);
  const [expandedInstanceId, setExpandedInstanceId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(null);
  const totalCols = rowColSpan(columns.length, block.steps.length);
  const formEditHref = showEditLink
    ? fmsFormHref(
        block.form.id,
        returnContext === "my-stops" ? "my-stops" : "lines",
      )
    : undefined;

  function toggleRow(instanceId: string) {
    setExpandedInstanceId((current) => (current === instanceId ? null : instanceId));
  }

  function openTaskForStepState(stepStateId: string) {
    for (const instance of block.instances) {
      const state = instance.stepStates.find((item) => item.id === stepStateId);
      if (!state) {
        continue;
      }
      const stepIndex = block.steps.findIndex((step) => step.id === state.stepId);
      const step = block.steps[stepIndex];
      if (!step) {
        return;
      }
      const ownerName =
        state.owner?.name ?? state.owner?.email.split("@")[0] ?? null;
      const isMine =
        viewerUserId &&
        state.ownerUserId === viewerUserId &&
        state.status === "IN_PROGRESS";
      if (!isMine) {
        return;
      }
      setActiveTask({
        meta: stepMeta(block, step, stepIndex, ownerName),
        canComplete: true,
        stepState: {
          id: state.id,
          status: state.status,
          ownerUserId: state.ownerUserId,
          step: {
            stepName: step.stepName,
            allowMarkDone: step.allowMarkDone,
            allowUpload: step.allowUpload,
            allowNotes: step.allowNotes,
            captureFields: step.captureFields,
          },
        },
      });
      return;
    }
  }

  return (
    <>
      <div className="ws-fms-tracker-scroll">
        <table className="ws-fms-tracker-table">
          <thead>
            <tr className="ws-fms-tracker-row-lead">
              <th className="ws-fms-tracker-band is-route">Route</th>
              <th
                colSpan={columns.length + 1}
                className="ws-fms-tracker-band is-lead"
              >
                Lead / intake
              </th>
              {block.steps.map((step, index) => (
                <th key={step.id} colSpan={4} className="ws-fms-tracker-band is-step">
                  <div className="ws-fms-tracker-step-head">
                    <span>Step {index + 1}</span>
                    <FmsStepManagePopover
                      compact
                      showEditLink={showEditLink}
                      editHref={formEditHref}
                      meta={stepMeta(block, step, index)}
                    />
                  </div>
                  <strong className="ws-fms-tracker-step-name">{step.stepName}</strong>
                </th>
              ))}
            </tr>
            <tr className="ws-fms-tracker-row-sub">
              <th className="ws-fms-tracker-route-col">Snapshot</th>
              <th className="ws-fms-tracker-lead-col is-label">Lead</th>
              {columns.map((field) => (
                <th key={field.id} className="ws-fms-tracker-lead-col">
                  {field.label}
                </th>
              ))}
              {block.steps.map((step) => (
                <Fragment key={step.id}>
                  <th className="ws-fms-tracker-pas is-planned">Planned</th>
                  <th className="ws-fms-tracker-pas is-actual">Actual</th>
                  <th className="ws-fms-tracker-pas is-delay">Delay</th>
                  <th className="ws-fms-tracker-pas is-status">Status</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.instances.map((instance) => {
              const values = (instance.submission?.values ?? {}) as Record<
                string,
                unknown
              >;
              const stepByStepId = new Map(
                instance.stepStates.map((state) => [state.stepId, state]),
              );
              const expanded = expandedInstanceId === instance.id;
              const snapshotStops = block.steps.map((step) => {
                const state = stepByStepId.get(step.id);
                return {
                  id: step.id,
                  status: state?.status ?? ("PENDING" as FmsStepStatus),
                  plannedAt: state?.plannedAt ? new Date(state.plannedAt) : null,
                  actualAt: state?.actualAt ? new Date(state.actualAt) : null,
                  delayMinutes: state?.delayMinutes ?? null,
                };
              });

              return (
                <Fragment key={instance.id}>
                  <tr
                    className={`ws-fms-tracker-data-row${expanded ? " is-expanded" : ""}`}
                  >
                    <td className="ws-fms-tracker-route-col">
                      <FmsTrainRouteSnapshot
                        stops={snapshotStops}
                        expanded={expanded}
                        label={instance.referenceLabel ?? "Lead route"}
                        onToggle={() => toggleRow(instance.id)}
                      />
                    </td>
                    <td className="ws-fms-tracker-lead-col is-label">
                      <Link
                        href={fmsInstanceHref(
                          instance.id,
                          returnContext,
                          returnTemplateId,
                        )}
                        className="ws-fms-tracker-lead-link"
                      >
                        <FileInput size={14} aria-hidden />
                        {instance.referenceLabel ?? "Lead"}
                      </Link>
                    </td>
                    {columns.map((field) => (
                      <td key={field.id} className="ws-fms-tracker-lead-col">
                        {displayValue(values[field.fieldKey])}
                      </td>
                    ))}
                    {block.steps.map((step, stepIndex) => {
                      const state = stepByStepId.get(step.id);
                      if (!state) {
                        return (
                          <Fragment key={step.id}>
                            <td className="ws-fms-tracker-pas">-</td>
                            <td className="ws-fms-tracker-pas">-</td>
                            <td className="ws-fms-tracker-pas">-</td>
                            <td className="ws-fms-tracker-pas">-</td>
                          </Fragment>
                        );
                      }

                      const plannedAt = state.plannedAt;
                      const actualAt = state.actualAt;
                      const delay = liveDelayMinutes(
                        plannedAt ? new Date(plannedAt) : null,
                        actualAt ? new Date(actualAt) : null,
                        state.delayMinutes,
                      );
                      const delayLabel = formatDelayLabel(delay);
                      const overdue = isStepOverdue(
                        state.status,
                        plannedAt ? new Date(plannedAt) : null,
                        actualAt ? new Date(actualAt) : null,
                        state.delayMinutes,
                      );
                      const isMine =
                        viewerUserId &&
                        state.ownerUserId === viewerUserId &&
                        state.status === "IN_PROGRESS";
                      const ownerName =
                        state.owner?.name ?? state.owner?.email.split("@")[0] ?? null;
                      const doneLate =
                        state.status === "DONE" && Boolean(delay && delay > 0);
                      const actualClass =
                        state.status === "DONE"
                          ? doneLate
                            ? "is-late"
                            : "is-ontime"
                          : overdue
                            ? "is-overdue"
                            : "";

                      function openTask() {
                        if (!isMine || !state) {
                          return;
                        }
                        const stepState = state;
                        setActiveTask({
                          meta: stepMeta(block, step, stepIndex, ownerName),
                          canComplete: true,
                          stepState: {
                            id: stepState.id,
                            status: stepState.status,
                            ownerUserId: stepState.ownerUserId,
                            step: {
                              stepName: step.stepName,
                              allowMarkDone: step.allowMarkDone,
                              allowUpload: step.allowUpload,
                              allowNotes: step.allowNotes,
                              captureFields: step.captureFields,
                            },
                          },
                        });
                      }

                      return (
                        <Fragment key={step.id}>
                          <td className="ws-fms-tracker-pas is-planned">
                            {formatCellDate(plannedAt)}
                          </td>
                          <td className={`ws-fms-tracker-pas is-actual ${actualClass}`}>
                            {formatCellDate(actualAt)}
                          </td>
                          <td
                            className={`ws-fms-tracker-pas is-delay${delayLabel ? " is-late" : ""}`}
                          >
                            {delayLabel ?? (state.status === "PENDING" ? "-" : "None")}
                          </td>
                          <td
                            className={`ws-fms-tracker-pas is-status${isMine ? " is-actionable" : ""}`}
                          >
                            {isMine ? (
                              <button
                                type="button"
                                className="ws-fms-tracker-task-btn"
                                onClick={openTask}
                              >
                                <FmsStatusBadge status={state.status} />
                                <span>Complete</span>
                              </button>
                            ) : (
                              <FmsStatusBadge status={state.status} />
                            )}
                          </td>
                        </Fragment>
                      );
                    })}
                  </tr>
                  {expanded ? (
                    <tr className="ws-fms-tracker-expand-row">
                      <td colSpan={totalCols}>
                        <FmsTrackerRowDetail
                          instanceId={instance.id}
                          referenceLabel={instance.referenceLabel}
                          submissionValues={values}
                          formFields={block.form.fields}
                          steps={block.steps}
                          stepStates={instance.stepStates}
                          viewerUserId={viewerUserId}
                          returnContext={returnContext}
                          returnTemplateId={returnTemplateId}
                          onCompleteStep={openTaskForStepState}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeTask ? (
        <FmsStepTaskModal
          meta={activeTask.meta}
          stepState={activeTask.stepState}
          canComplete={activeTask.canComplete}
          open
          onClose={() => setActiveTask(null)}
        />
      ) : null}
    </>
  );
}
