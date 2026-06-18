"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { FileInput } from "lucide-react";
import type { FmsStepStatus } from "@prisma/client";
import { FmsStatusBadge } from "@/components/saas/fms-status-badge";
import { FmsStepManagePopover } from "@/components/saas/fms-step-manage-popover";
import { FmsStepTaskModal } from "@/components/saas/fms-step-task-modal";
import type { FmsStepManageMeta } from "@/components/saas/fms-step-info-modal";
import type { FmsStepCompleteState } from "@/components/saas/fms-step-complete-panel";
import type { FmsSlaConfig } from "@/lib/fms/constants";
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

export function FmsMasterTrackerTable({
  block,
  viewerUserId,
  showEditLink = true,
}: {
  block: TrackerTableBlock;
  viewerUserId?: string;
  showEditLink?: boolean;
}) {
  const columns = useMemo(() => leadColumns(block.form.fields), [block.form.fields]);
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(null);

  return (
    <>
      <div className="ws-fms-tracker-scroll">
        <table className="ws-fms-tracker-table">
          <thead>
            <tr className="ws-fms-tracker-row-lead">
              <th colSpan={columns.length + 1} className="ws-fms-tracker-band is-lead">
                Lead / intake
              </th>
              {block.steps.map((step, index) => (
                <th key={step.id} colSpan={4} className="ws-fms-tracker-band is-step">
                  <div className="ws-fms-tracker-step-head">
                    <span>Step {index + 1}</span>
                    <FmsStepManagePopover
                      compact
                      showEditLink={showEditLink}
                      meta={stepMeta(block, step, index)}
                    />
                  </div>
                  <strong className="ws-fms-tracker-step-name">{step.stepName}</strong>
                </th>
              ))}
            </tr>
            <tr className="ws-fms-tracker-row-sub">
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

              return (
                <tr key={instance.id} className="ws-fms-tracker-data-row">
                  <td className="ws-fms-tracker-lead-col is-label">
                    <Link
                      href={`/app/fms/instances/${instance.id}`}
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
