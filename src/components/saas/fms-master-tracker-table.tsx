"use client";

import { Fragment, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FileInput } from "lucide-react";
import type { FmsStepStatus } from "@prisma/client";
import { FmsStatusBadge } from "@/components/saas/fms-status-badge";
import { FmsStepManagePopover } from "@/components/saas/fms-step-manage-popover";
import { FmsTrainRouteSnapshot } from "@/components/saas/fms-train-route-snapshot";
import type { FmsStepManageMeta } from "@/components/saas/fms-step-info-modal";
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

function instanceHasMyActiveStop(
  instance: TrackerTableBlock["instances"][number],
  viewerUserId?: string,
) {
  return Boolean(
    viewerUserId &&
      instance.stepStates.some(
        (state) =>
          state.ownerUserId === viewerUserId && state.status === "IN_PROGRESS",
      ),
  );
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
  const router = useRouter();
  const columns = useMemo(() => leadColumns(block.form.fields), [block.form.fields]);
  const formEditHref = showEditLink
    ? fmsFormHref(
        block.form.id,
        returnContext === "my-stops" ? "my-stops" : "lines",
      )
    : undefined;

  function rowHref(instance: TrackerTableBlock["instances"][number]) {
    const openComplete = instanceHasMyActiveStop(instance, viewerUserId);
    return fmsInstanceHref(
      instance.id,
      returnContext,
      returnTemplateId,
      openComplete ? "complete" : undefined,
    );
  }

  function openRow(instance: TrackerTableBlock["instances"][number]) {
    router.push(rowHref(instance));
  }

  return (
    <div className="ws-fms-tracker-scroll">
      <table className="ws-fms-tracker-table">
        <thead>
          <tr className="ws-fms-tracker-row-steps">
            <th
              rowSpan={2}
              className="ws-fms-tracker-route-col is-snap"
              aria-label="Route snapshot"
            />
            <th rowSpan={2} className="ws-fms-tracker-lead-col is-label">
              Lead
            </th>
            {columns.map((field) => (
              <th key={field.id} rowSpan={2} className="ws-fms-tracker-lead-col">
                {field.label}
              </th>
            ))}
            {block.steps.map((step, index) => (
              <th key={step.id} colSpan={4} className="ws-fms-tracker-band is-step">
                <div className="ws-fms-tracker-step-head">
                  <strong className="ws-fms-tracker-step-name">{step.stepName}</strong>
                  <FmsStepManagePopover
                    compact
                    showEditLink={showEditLink}
                    editHref={formEditHref}
                    meta={stepMeta(block, step, index)}
                  />
                </div>
                <p className="ws-fms-tracker-step-doer">
                  {step.roleLabel ??
                    step.defaultOwner?.name ??
                    step.defaultOwner?.email.split("@")[0] ??
                    "Unassigned"}
                </p>
              </th>
            ))}
          </tr>
          <tr className="ws-fms-tracker-row-sub">
            {block.steps.map((step) => (
              <Fragment key={step.id}>
                <th className="ws-fms-tracker-pas is-planned is-centered">Planned</th>
                <th className="ws-fms-tracker-pas is-actual is-centered">Actual</th>
                <th className="ws-fms-tracker-pas is-delay is-centered">Delay</th>
                <th className="ws-fms-tracker-pas is-status is-centered">Status</th>
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
            const leadName = instance.referenceLabel ?? "Lead";

            return (
              <tr
                key={instance.id}
                className="ws-fms-tracker-data-row is-clickable"
                role="link"
                tabIndex={0}
                aria-label={`Open full journey for ${leadName}`}
                onClick={() => openRow(instance)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openRow(instance);
                  }
                }}
              >
                <td className="ws-fms-tracker-route-col">
                  <FmsTrainRouteSnapshot
                    stops={snapshotStops}
                    label={`${leadName} route`}
                  />
                </td>
                <td className="ws-fms-tracker-lead-col is-label">
                  <span className="ws-fms-tracker-lead-link">
                    <FileInput size={14} aria-hidden />
                    {leadName}
                  </span>
                </td>
                {columns.map((field) => (
                  <td key={field.id} className="ws-fms-tracker-lead-col">
                    {displayValue(values[field.fieldKey])}
                  </td>
                ))}
                {block.steps.map((step) => {
                  const state = stepByStepId.get(step.id);
                  if (!state) {
                    return (
                      <Fragment key={step.id}>
                        <td className="ws-fms-tracker-pas is-centered">-</td>
                        <td className="ws-fms-tracker-pas is-centered">-</td>
                        <td className="ws-fms-tracker-pas is-centered">-</td>
                        <td className="ws-fms-tracker-pas is-centered">-</td>
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

                  return (
                    <Fragment key={step.id}>
                      <td className="ws-fms-tracker-pas is-planned is-centered">
                        {formatCellDate(plannedAt)}
                      </td>
                      <td
                        className={`ws-fms-tracker-pas is-actual is-centered ${actualClass}`}
                      >
                        {formatCellDate(actualAt)}
                      </td>
                      <td
                        className={`ws-fms-tracker-pas is-delay is-centered${delayLabel ? " is-late" : ""}`}
                      >
                        {delayLabel ?? (state.status === "PENDING" ? "-" : "None")}
                      </td>
                      <td
                        className={`ws-fms-tracker-pas is-status is-centered${isMine ? " is-actionable" : ""}`}
                      >
                        <FmsStatusBadge status={state.status} />
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
  );
}
