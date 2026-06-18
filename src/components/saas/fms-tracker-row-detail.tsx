"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { FmsStepStatus } from "@prisma/client";
import { FmsStatusBadge } from "@/components/saas/fms-status-badge";
import { FmsTrainTrack, type TrainTrackStop } from "@/components/saas/fms-train-track";
import { fmsInstanceHref, type FmsFromContext } from "@/lib/fms/navigation";
import {
  formatDelayLabel,
  formatStepWhenLabel,
  formatTatClock,
  liveDelayMinutes,
} from "@/lib/fms/step-display";
import type { FmsSlaConfig } from "@/lib/fms/constants";
import type { FmsStepManageMeta } from "@/components/saas/fms-step-info-modal";

type LeadField = {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: string;
};

type StepDef = {
  id: string;
  stepName: string;
  roleLabel: string | null;
  instructions: string | null;
  slaType: FmsStepManageMeta["slaType"];
  slaConfig: unknown;
};

type StepState = {
  id: string;
  stepId: string;
  status: FmsStepStatus;
  plannedAt: string | null;
  actualAt: string | null;
  delayMinutes: number | null;
  ownerUserId: string | null;
  owner: { name: string | null; email: string } | null;
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
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function allLeadFields(fields: LeadField[]) {
  return fields.filter(
    (field) =>
      field.fieldType !== "FILE" &&
      !/timestamp/i.test(field.label) &&
      !/timestamp/i.test(field.fieldKey),
  );
}

export function FmsTrackerRowDetail({
  instanceId,
  referenceLabel,
  submissionValues,
  formFields,
  steps,
  stepStates,
  viewerUserId,
  returnContext = "lines",
  returnTemplateId,
  onCompleteStep,
}: {
  instanceId: string;
  referenceLabel: string | null;
  submissionValues: Record<string, unknown>;
  formFields: LeadField[];
  steps: StepDef[];
  stepStates: StepState[];
  viewerUserId?: string;
  returnContext?: FmsFromContext;
  returnTemplateId?: string;
  onCompleteStep?: (stepStateId: string) => void;
}) {
  const stepByStepId = new Map(stepStates.map((state) => [state.stepId, state]));
  const activeState = stepStates.find((state) => state.status === "IN_PROGRESS");
  const activeStepIndex = activeState
    ? steps.findIndex((step) => step.id === activeState.stepId)
    : -1;
  const activeStep = activeStepIndex >= 0 ? steps[activeStepIndex] : null;

  const trainStops: TrainTrackStop[] = steps.map((step) => {
    const state = stepByStepId.get(step.id);
    return {
      id: step.id,
      name: step.stepName,
      status: state?.status ?? "PENDING",
      plannedAt: state?.plannedAt ? new Date(state.plannedAt) : null,
      actualAt: state?.actualAt ? new Date(state.actualAt) : null,
      delayMinutes: state?.delayMinutes ?? null,
      ownerName:
        state?.owner?.name ?? state?.owner?.email.split("@")[0] ?? null,
    };
  });

  const canCompleteActive =
    Boolean(
      activeState &&
        viewerUserId &&
        activeState.ownerUserId === viewerUserId &&
        activeState.status === "IN_PROGRESS",
    ) && Boolean(onCompleteStep);

  const activeDelay = activeState
    ? liveDelayMinutes(
        activeState.plannedAt ? new Date(activeState.plannedAt) : null,
        activeState.actualAt ? new Date(activeState.actualAt) : null,
        activeState.delayMinutes,
      )
    : null;

  const instanceHref = fmsInstanceHref(
    instanceId,
    returnContext,
    returnTemplateId,
  );

  return (
    <div className="ws-fms-tracker-row-detail">
      <div className="ws-fms-tracker-row-detail-grid">
        <section className="ws-fms-tracker-row-detail-lead">
          <h3>Lead details</h3>
          <p className="ws-fms-tracker-row-detail-title">
            {referenceLabel ?? "Lead"}
          </p>
          <dl className="ws-fms-tracker-row-detail-fields">
            {allLeadFields(formFields).map((field) => (
              <div key={field.id}>
                <dt>{field.label}</dt>
                <dd>{displayValue(submissionValues[field.fieldKey])}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="ws-fms-tracker-row-detail-route">
          <h3>Live route</h3>
          <FmsTrainTrack
            stops={trainStops}
            compact
            showOwner
            startLabel="Form"
            endLabel="Done"
          />
        </section>
      </div>

      {activeStep && activeState ? (
        <section className="ws-fms-tracker-row-detail-stop">
          <header>
            <div>
              <p className="ws-fms-tracker-row-detail-eyebrow">Stopped here</p>
              <h3>
                Step {activeStepIndex + 1}: {activeStep.stepName}
              </h3>
            </div>
            <FmsStatusBadge status={activeState.status} />
          </header>
          <dl className="ws-fms-step-manage-meta ws-fms-tracker-row-detail-meta">
            <div>
              <dt>WHAT</dt>
              <dd>{activeStep.stepName}</dd>
            </div>
            <div>
              <dt>HOW</dt>
              <dd>{activeStep.instructions?.trim() || "-"}</dd>
            </div>
            <div>
              <dt>WHO</dt>
              <dd>
                {activeState.owner?.name ??
                  activeState.owner?.email.split("@")[0] ??
                  activeStep.roleLabel ??
                  "Unassigned"}
              </dd>
            </div>
            <div>
              <dt>WHEN</dt>
              <dd>{formatStepWhenLabel(activeStep.slaType)}</dd>
            </div>
            <div>
              <dt>TAT</dt>
              <dd>
                {formatTatClock(
                  activeStep.slaType,
                  (activeStep.slaConfig ?? {}) as FmsSlaConfig,
                )}
              </dd>
            </div>
            <div>
              <dt>Planned</dt>
              <dd>{formatCellDate(activeState.plannedAt)}</dd>
            </div>
            <div>
              <dt>Actual</dt>
              <dd>{formatCellDate(activeState.actualAt)}</dd>
            </div>
            <div>
              <dt>Delay</dt>
              <dd>
                {formatDelayLabel(activeDelay) ??
                  (activeState.status === "PENDING" ? "-" : "None")}
              </dd>
            </div>
          </dl>
          <div className="ws-fms-tracker-row-detail-actions">
            {canCompleteActive ? (
              <button
                type="button"
                className="btn-primary btn-sm ws-sf-btn-primary"
                onClick={() => onCompleteStep?.(activeState.id)}
              >
                Complete this stop
              </button>
            ) : null}
            <Link
              href={instanceHref}
              className="ws-fms-tracker-row-detail-link"
            >
              Open full journey
              <ChevronRight size={14} aria-hidden />
            </Link>
          </div>
        </section>
      ) : (
        <section className="ws-fms-tracker-row-detail-stop is-idle">
          <p className="ws-fms-muted">
            No active stop right now.{" "}
            <Link href={instanceHref}>Open full journey</Link>
          </p>
        </section>
      )}
    </div>
  );
}
