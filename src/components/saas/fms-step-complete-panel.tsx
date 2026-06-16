"use client";

import { useActionState, useState } from "react";
import type { FmsStepStatus } from "@prisma/client";
import { completeFmsStepAction } from "@/app/app/fms/actions";
import { fmsInitialState } from "@/lib/fms-action-state";
import type { FmsCaptureField } from "@/lib/fms/constants";

type StepState = {
  id: string;
  status: FmsStepStatus;
  step: {
    stepName: string;
    allowMarkDone: boolean;
    allowUpload: boolean;
    allowNotes: boolean;
    captureFields: unknown;
  };
};

export function FmsStepCompletePanel({
  stepState,
  canComplete,
}: {
  stepState: StepState;
  canComplete: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    completeFmsStepAction,
    fmsInitialState,
  );
  const captureFields = Array.isArray(stepState.step.captureFields)
    ? (stepState.step.captureFields as FmsCaptureField[])
    : [];
  const [completionValues, setCompletionValues] = useState<Record<string, string>>(
    {},
  );

  if (stepState.status === "DONE") {
    return null;
  }

  if (!canComplete || !stepState.step.allowMarkDone) {
    return (
      <div className="ws-sf-card ws-fms-step-panel is-readonly">
        <header className="ws-fms-step-panel-header">
          <h3>{stepState.step.stepName}</h3>
          <span className="ws-sf-badge ws-sf-badge-info">In progress</span>
        </header>
        <p className="ws-fms-muted">
          This step is in progress. Only the assigned owner can mark it done.
        </p>
      </div>
    );
  }

  function setCaptureValue(key: string, value: string) {
    setCompletionValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form
      action={formAction}
      className="ws-sf-card ws-fms-step-panel"
      encType="multipart/form-data"
    >
      <input type="hidden" name="stepStateId" value={stepState.id} />
      <input
        type="hidden"
        name="completionValuesJson"
        value={JSON.stringify(completionValues)}
        readOnly
      />

      <header className="ws-fms-step-panel-header">
        <h3>Complete: {stepState.step.stepName}</h3>
        <span className="ws-sf-badge ws-sf-badge-info">Action required</span>
      </header>

      {captureFields.length > 0 ? (
        <div className="form-grid-premium">
          {captureFields.map((field) => (
            <label key={field.key}>
              <span>
                {field.label}
                {field.required ? " *" : ""}
              </span>
              {field.type === "TEXT" ? (
                <input
                  required={field.required}
                  value={completionValues[field.key] ?? ""}
                  onChange={(e) => setCaptureValue(field.key, e.target.value)}
                />
              ) : null}
              {field.type === "NUMBER" ? (
                <input
                  type="number"
                  required={field.required}
                  value={completionValues[field.key] ?? ""}
                  onChange={(e) => setCaptureValue(field.key, e.target.value)}
                />
              ) : null}
              {field.type === "DATE" ? (
                <input
                  type="date"
                  required={field.required}
                  value={completionValues[field.key] ?? ""}
                  onChange={(e) => setCaptureValue(field.key, e.target.value)}
                />
              ) : null}
              {field.type === "DATETIME" ? (
                <input
                  type="datetime-local"
                  required={field.required}
                  value={completionValues[field.key] ?? ""}
                  onChange={(e) => setCaptureValue(field.key, e.target.value)}
                />
              ) : null}
            </label>
          ))}
        </div>
      ) : null}

      {stepState.step.allowNotes ? (
        <label className="form-field-full">
          <span>Notes / remarks</span>
          <textarea name="notes" rows={3} placeholder="Optional remarks" />
        </label>
      ) : null}

      {stepState.step.allowUpload ? (
        <label className="form-field-full">
          <span>Attachment</span>
          <input type="file" name="attachment" />
        </label>
      ) : null}

      {state.message ? (
        <p className={state.ok ? "ws-form-success" : "ws-form-error"}>{state.message}</p>
      ) : null}

      <div className="form-actions ws-fms-form-actions">
        <button type="submit" className="btn-primary ws-sf-btn-primary" disabled={pending}>
          {pending ? "Saving..." : "Mark step done"}
        </button>
      </div>
    </form>
  );
}
