"use client";

import { useActionState, useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, Paperclip, StickyNote, X } from "lucide-react";
import type { FmsStepStatus } from "@prisma/client";
import { completeFmsStepAction } from "@/app/app/fms/actions";
import { fmsInitialState } from "@/lib/fms-action-state";
import type { FmsCaptureField } from "@/lib/fms/constants";

export type FmsStepCompleteState = {
  id: string;
  status: FmsStepStatus;
  ownerUserId?: string | null;
  step: {
    stepName: string;
    allowMarkDone: boolean;
    allowUpload: boolean;
    allowNotes: boolean;
    captureFields: unknown;
  };
};

function StepCompleteForm({
  stepState,
  onCancel,
  embedded = false,
}: {
  stepState: FmsStepCompleteState;
  onCancel?: () => void;
  embedded?: boolean;
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
  const [markedDone, setMarkedDone] = useState(false);

  useEffect(() => {
    if (state.ok && onCancel) {
      onCancel();
    }
  }, [state.ok, onCancel]);

  function setCaptureValue(key: string, value: string) {
    setCompletionValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div
      className={`ws-sf-card ws-fms-step-panel ws-fms-step-panel-form${embedded ? " is-embedded" : ""}`}
    >
      <header className="ws-fms-step-panel-form-header">
        <div>
          <h3>Your stop: {stepState.step.stepName}</h3>
          <p className="ws-fms-step-panel-intro">
            Mark done, add notes, or upload proof
          </p>
        </div>
        {onCancel ? (
          <button
            aria-label="Close"
            className="ws-fms-step-panel-close"
            type="button"
            onClick={onCancel}
          >
            <X aria-hidden size={16} />
          </button>
        ) : null}
      </header>

      <form
        action={formAction}
        className="ws-fms-step-panel-body"
        encType="multipart/form-data"
      >
        <input type="hidden" name="stepStateId" value={stepState.id} />
        <input
          type="hidden"
          name="completionValuesJson"
          value={JSON.stringify(completionValues)}
          readOnly
        />

        <section className="ws-fms-step-option ws-fms-step-option-mark">
          <div className="ws-fms-step-option-head">
            <CheckCircle2 aria-hidden size={16} />
            <strong>Mark done</strong>
          </div>
          <label className="ws-fms-step-mark-done">
            <input
              checked={markedDone}
              name="markDoneAck"
              type="checkbox"
              onChange={(event) => setMarkedDone(event.target.checked)}
            />
            <span>I have completed my work at this stop</span>
          </label>
        </section>

        <section className="ws-fms-step-option">
          <div className="ws-fms-step-option-head">
            <StickyNote aria-hidden size={16} />
            <strong>Notes</strong>
          </div>
          <label className="form-field-full">
            <span className="sr-only">Notes / remarks</span>
            <textarea name="notes" placeholder="Optional remarks" rows={3} />
          </label>
        </section>

        <section className="ws-fms-step-option">
          <div className="ws-fms-step-option-head">
            <Paperclip aria-hidden size={16} />
            <strong>Upload</strong>
          </div>
          <label className="form-field-full">
            <span className="sr-only">Attachment</span>
            <input
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              name="attachment"
              type="file"
            />
          </label>
          <p className="ws-fms-step-option-hint">Optional proof or supporting file</p>
        </section>

        {captureFields.length > 0 ? (
          <section className="ws-fms-step-option">
            <div className="ws-fms-step-option-head">
              <strong>Step fields</strong>
            </div>
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
          </section>
        ) : null}

        {state.message ? (
          <p className={state.ok ? "ws-form-success" : "ws-form-error"}>
            {state.message}
          </p>
        ) : null}

        <div className="form-actions ws-fms-form-actions">
          <button
            className="btn-primary ws-sf-btn-primary"
            disabled={pending || !markedDone}
            type="submit"
          >
            {pending ? "Completing..." : "Complete step"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function FmsStepCompletePanel({
  stepState,
  canComplete,
  defaultExpanded = false,
  mode = "collapsible",
  onCancel,
}: {
  stepState: FmsStepCompleteState;
  canComplete: boolean;
  defaultExpanded?: boolean;
  mode?: "collapsible" | "form";
  onCancel?: () => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (stepState.status === "DONE") {
    return null;
  }

  if (mode === "form") {
    if (!canComplete || !stepState.step.allowMarkDone) {
      return null;
    }
    return (
      <StepCompleteForm embedded stepState={stepState} onCancel={onCancel} />
    );
  }

  if (!canComplete || !stepState.step.allowMarkDone) {
    const message = !stepState.step.allowMarkDone
      ? "This step is tracked for visibility only."
      : !stepState.ownerUserId
        ? "This step has no owner assigned. A manager must reassign before work can continue."
        : "Only the assigned owner can complete this step.";

    return (
      <details className="ws-fms-step-panel-collapsible ws-sf-card ws-fms-step-panel is-readonly">
        <summary className="ws-fms-step-panel-summary">
          <span className="ws-fms-step-panel-summary-copy">
            <strong>Stop: {stepState.step.stepName}</strong>
            <small>{message}</small>
          </span>
          <ChevronDown aria-hidden className="ws-fms-step-panel-chevron" size={18} />
        </summary>
        <div className="ws-fms-step-panel-body">
          <p className="ws-fms-muted">{message}</p>
        </div>
      </details>
    );
  }

  return (
    <details
      className="ws-fms-step-panel-collapsible ws-sf-card ws-fms-step-panel"
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary className="ws-fms-step-panel-summary">
        <span className="ws-fms-step-panel-summary-copy">
          <strong>Your stop: {stepState.step.stepName}</strong>
          <small>Mark done, add notes, or upload proof</small>
        </span>
        <ChevronDown aria-hidden className="ws-fms-step-panel-chevron" size={18} />
      </summary>
      <div onClick={(event) => event.stopPropagation()}>
        <StepCompleteForm stepState={stepState} />
      </div>
    </details>
  );
}
