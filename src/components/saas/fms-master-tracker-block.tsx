import Link from "next/link";
import { Fragment } from "react";
import { FileInput, Settings2 } from "lucide-react";
import type { FmsInstanceStatus, FmsStepStatus } from "@prisma/client";
import { FmsStatusBadge } from "@/components/saas/fms-status-badge";
import {
  FmsStepManagePopover,
  type FmsStepManageMeta,
} from "@/components/saas/fms-step-manage-popover";
import type { FmsSlaConfig } from "@/lib/fms/constants";
import {
  isStepOverdue,
  liveDelayMinutes,
} from "@/lib/fms/step-display";

type FormField = {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: string;
};

type TemplateStep = {
  id: string;
  stepName: string;
  roleLabel: string | null;
  instructions: string | null;
  slaType: FmsStepManageMeta["slaType"];
  slaConfig: unknown;
  defaultOwner: { name: string | null; email: string } | null;
};

type StepState = {
  id: string;
  stepId: string;
  status: FmsStepStatus;
  plannedAt: Date | null;
  actualAt: Date | null;
  delayMinutes: number | null;
};

type TrackerInstance = {
  id: string;
  referenceLabel: string | null;
  status: FmsInstanceStatus;
  submission: { values: unknown; createdAt: Date } | null;
  stepStates: StepState[];
};

export type FmsTrackerBlock = {
  id: string;
  name: string;
  form: {
    id: string;
    name: string;
    fields: FormField[];
  };
  steps: TemplateStep[];
  instances: TrackerInstance[];
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

function formatCellDate(value: Date | null) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

function leadColumns(fields: FormField[]) {
  return fields
    .filter(
      (field) =>
        field.fieldType !== "FILE" &&
        !/timestamp/i.test(field.label) &&
        !/timestamp/i.test(field.fieldKey),
    )
    .slice(0, 4);
}

function actualTone(
  status: FmsStepStatus,
  plannedAt: Date | null,
  actualAt: Date | null,
  delayMinutes: number | null,
) {
  if (!actualAt || status !== "DONE") {
    return "";
  }
  const delay = liveDelayMinutes(plannedAt, actualAt, delayMinutes);
  if (delay && delay > 0) {
    return "is-late";
  }
  return "is-ontime";
}

export function FmsMasterTrackerBlock({ block }: { block: FmsTrackerBlock }) {
  const columns = leadColumns(block.form.fields);

  return (
    <section className="ws-sf-card ws-fms-tracker-block">
      <header className="ws-fms-tracker-block-head">
        <div>
          <p className="ws-fms-tracker-block-eyebrow">FMS tracker</p>
          <h2>{block.name}</h2>
          <p className="ws-fms-muted">
            {block.instances.length} lead{block.instances.length === 1 ? "" : "s"} ÿ{" "}
            {block.steps.length} step{block.steps.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="ws-fms-tracker-block-actions">
          <Link
            href={`/app/fms/forms/${block.form.id}/submit`}
            className="btn-primary btn-sm ws-sf-btn-primary"
          >
            New lead
          </Link>
          <Link
            href={`/app/fms/forms/${block.form.id}`}
            className="ws-fms-tracker-manage-link"
            title="Manage workflow and form"
          >
            <Settings2 size={16} aria-hidden />
            Manage
          </Link>
        </div>
      </header>

      <div className="ws-fms-tracker-scroll">
        <table className="ws-fms-tracker-table">
          <thead>
            <tr className="ws-fms-tracker-row-lead">
              <th colSpan={columns.length + 1} className="ws-fms-tracker-band is-lead">
                Lead / intake
              </th>
              {block.steps.map((step, index) => (
                <th
                  key={step.id}
                  colSpan={3}
                  className="ws-fms-tracker-band is-step"
                >
                  <div className="ws-fms-tracker-step-head">
                    <span>Step {index + 1}</span>
                    <FmsStepManagePopover
                      compact
                      meta={{
                        stepName: step.stepName,
                        instructions: step.instructions,
                        roleLabel: step.roleLabel,
                        whoName:
                          step.defaultOwner?.name ??
                          step.defaultOwner?.email.split("@")[0] ??
                          null,
                        slaType: step.slaType,
                        slaConfig: (step.slaConfig ?? {}) as FmsSlaConfig,
                        formId: block.form.id,
                        stepIndex: index,
                      }}
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
                  {block.steps.map((step) => {
                    const state = stepByStepId.get(step.id);
                    if (!state) {
                      return (
                        <Fragment key={step.id}>
                          <td className="ws-fms-tracker-pas">-</td>
                          <td className="ws-fms-tracker-pas">-</td>
                          <td className="ws-fms-tracker-pas">-</td>
                        </Fragment>
                      );
                    }

                    const overdue = isStepOverdue(
                      state.status,
                      state.plannedAt,
                      state.actualAt,
                      state.delayMinutes,
                    );
                    const actualClass = actualTone(
                      state.status,
                      state.plannedAt,
                      state.actualAt,
                      state.delayMinutes,
                    );

                    return (
                      <Fragment key={step.id}>
                        <td className="ws-fms-tracker-pas is-planned">
                          {formatCellDate(state.plannedAt)}
                        </td>
                        <td
                          className={`ws-fms-tracker-pas is-actual ${actualClass}${overdue && state.status === "IN_PROGRESS" ? " is-overdue" : ""}`}
                        >
                          {formatCellDate(state.actualAt)}
                        </td>
                        <td className="ws-fms-tracker-pas is-status">
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
    </section>
  );
}
