"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, Plus, Settings2, Trash2 } from "lucide-react";
import {
  createFmsFlowDesign,
  submitFmsFlowDesignForApproval,
  updateFmsFlowDesign,
} from "@/app/app/fms/design-actions";
import { FmsNotificationsSettingsPanel } from "@/components/saas/fms-notifications-settings-panel";
import { FmsDesignApprovalPanel } from "@/components/saas/fms-design-approval-panel";
import { FmsStatusBadge } from "@/components/saas/fms-status-badge";
import { fmsInitialState } from "@/lib/fms-action-state";
import {
  DEFAULT_FMS_ALERT_CONFIG,
  parseAlertConfig,
  parseHolidayDates,
  type FmsAlertConfig,
} from "@/lib/fms/constants";
import {
  FMS_DESIGN_STATUS_LABELS,
  newFlowchartStep,
  parseFlowchartSteps,
  type FmsFlowchartStep,
} from "@/lib/fms/flow-design";
import type { FmsDesignStatus } from "@prisma/client";

type Member = { id: string; name: string; email: string };

function FlowStepNode({
  step,
  index,
  members,
  readOnly,
  onUpdate,
  onRemove,
  canRemove,
}: {
  step: FmsFlowchartStep;
  index: number;
  members: Member[];
  readOnly: boolean;
  onUpdate: (patch: Partial<FmsFlowchartStep>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="ws-fms-flow-node">
      <div className="ws-fms-flow-node-head">
        <span className="ws-fms-flow-node-index">{index + 1}</span>
        <input
          className="ws-fms-flow-node-title"
          value={step.stepName}
          readOnly={readOnly}
          onChange={(event) => onUpdate({ stepName: event.target.value })}
          placeholder={`Step ${index + 1} name`}
          aria-label={`Step ${index + 1} name`}
        />
        {!readOnly && canRemove ? (
          <button
            type="button"
            className="ws-fms-jf-gear ws-fms-jf-trash"
            aria-label="Remove step"
            onClick={onRemove}
          >
            <Trash2 size={16} aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="ws-fms-flow-node-grid">
        <label className="ws-fms-flow-field">
          <span className="ws-fms-flow-label">WHO</span>
          <select
            value={step.ownerUserId}
            disabled={readOnly}
            onChange={(event) => onUpdate({ ownerUserId: event.target.value })}
          >
            <option value="">Select owner...</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>

        <label className="ws-fms-flow-field ws-fms-flow-field-wide">
          <span className="ws-fms-flow-label">HOW</span>
          <textarea
            rows={2}
            value={step.howInstructions}
            readOnly={readOnly}
            onChange={(event) =>
              onUpdate({ howInstructions: event.target.value })
            }
            placeholder="What should the owner do in this step?"
          />
        </label>

        <label className="ws-fms-flow-field">
          <span className="ws-fms-flow-label">WHEN (TAT)</span>
          <div className="ws-fms-flow-tat-row">
            <input
              type="number"
              min={1}
              value={step.tatValue}
              readOnly={readOnly}
              onChange={(event) => onUpdate({ tatValue: event.target.value })}
              aria-label="TAT value"
            />
            <select
              value={step.tatUnit}
              disabled={readOnly}
              onChange={(event) =>
                onUpdate({
                  tatUnit: event.target.value as "hours" | "days",
                })
              }
              aria-label="TAT unit"
            >
              <option value="days">Days</option>
              <option value="hours">Hours</option>
            </select>
          </div>
        </label>
      </div>
    </div>
  );
}

export function FmsFlowchartBuilder({
  designId,
  initialName = "",
  initialDescription = "",
  initialSteps = [],
  initialHolidayDates = [],
  initialAlertConfig,
  initialStatus = "DRAFT",
  members,
  mode = "create",
  canApprove = false,
  reviewNote,
  linkedFormId,
}: {
  designId?: string;
  initialName?: string;
  initialDescription?: string;
  initialSteps?: FmsFlowchartStep[];
  initialHolidayDates?: unknown;
  initialAlertConfig?: unknown;
  initialStatus?: FmsDesignStatus;
  members: Member[];
  mode?: "create" | "edit";
  canApprove?: boolean;
  reviewNote?: string | null;
  linkedFormId?: string | null;
}) {
  const saveAction = mode === "create" ? createFmsFlowDesign : updateFmsFlowDesign;
  const [saveState, saveFormAction, savePending] = useActionState(
    saveAction,
    fmsInitialState,
  );
  const [submitState, submitFormAction, submitPending] = useActionState(
    submitFmsFlowDesignForApproval,
    fmsInitialState,
  );

  const readOnly =
    initialStatus === "PENDING_APPROVAL" || initialStatus === "APPROVED";

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [steps, setSteps] = useState<FmsFlowchartStep[]>(() =>
    initialSteps.length > 0 ? initialSteps : [newFlowchartStep("")],
  );
  const [holidayDates] = useState<string[]>(() =>
    parseHolidayDates(initialHolidayDates),
  );
  const [alertConfig, setAlertConfig] = useState<FmsAlertConfig>(() =>
    parseAlertConfig(initialAlertConfig ?? DEFAULT_FMS_ALERT_CONFIG),
  );
  const [notifyOpen, setNotifyOpen] = useState(false);
  const flowMainRef = useRef<HTMLDivElement>(null);
  const pendingScrollToStepId = useRef<string | null>(null);

  const stepsJson = JSON.stringify(steps);
  const holidayDatesJson = JSON.stringify(holidayDates);
  const alertConfigJson = JSON.stringify(alertConfig);
  const statusMessage = submitState.message || saveState.message;
  const statusOk = submitState.message ? submitState.ok : saveState.ok;

  function updateStep(id: string, patch: Partial<FmsFlowchartStep>) {
    setSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, ...patch } : step)),
    );
  }

  function addStep() {
    const step = newFlowchartStep("");
    pendingScrollToStepId.current = step.id;
    setSteps((prev) => [...prev, step]);
  }

  useEffect(() => {
    const stepId = pendingScrollToStepId.current;
    if (!stepId || !flowMainRef.current) {
      return;
    }
    pendingScrollToStepId.current = null;
    const node = flowMainRef.current.querySelector(
      `[data-flow-step-id="${stepId}"]`,
    );
    if (node instanceof HTMLElement) {
      node.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [steps]);

  function removeStep(id: string) {
    setSteps((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((step) => step.id !== id);
    });
  }

  return (
    <div className="ws-fms-flowchart-builder">
      <div className="ws-fms-flow-toolbar">
        <div className="ws-fms-flow-toolbar-main">
          <FmsStatusBadge status={initialStatus} />
          <span className="ws-fms-muted">
            {FMS_DESIGN_STATUS_LABELS[initialStatus]}
          </span>
          {linkedFormId ? (
            <Link href={`/app/fms/forms/${linkedFormId}`} className="ws-sf-record-link">
              Open live FMS
            </Link>
          ) : null}
        </div>
        {!readOnly ? (
          <button
            type="button"
            className={`ws-fms-flow-gear${notifyOpen ? " is-active" : ""}`}
            aria-label="Notification rules"
            title="Notification rules"
            onClick={() => setNotifyOpen((open) => !open)}
          >
            <Settings2 size={18} aria-hidden />
            <span>Notifications</span>
          </button>
        ) : null}
      </div>

      {reviewNote && initialStatus === "REJECTED" ? (
        <p className="saas-form-message error" role="alert">
          Owner feedback: {reviewNote}
        </p>
      ) : null}

      {canApprove && initialStatus === "PENDING_APPROVAL" && designId ? (
        <FmsDesignApprovalPanel designId={designId} />
      ) : null}

      <form action={saveFormAction} className="ws-fms-flow-form">
        {designId ? <input type="hidden" name="designId" value={designId} /> : null}
        <input type="hidden" name="stepsJson" value={stepsJson} readOnly />
        <input type="hidden" name="holidayDatesJson" value={holidayDatesJson} readOnly />
        <input type="hidden" name="alertConfigJson" value={alertConfigJson} readOnly />

        <div className={`ws-fms-flow-layout${notifyOpen ? " has-notify" : ""}`}>
          <div className="ws-fms-flow-main" ref={flowMainRef}>
            <header className="ws-fms-flow-header">
              <input
                name="name"
                required
                className="ws-fms-jf-title"
                value={name}
                readOnly={readOnly}
                onChange={(event) => setName(event.target.value)}
                placeholder="FMS flow name"
              />
              <input
                name="description"
                className="ws-fms-jf-desc"
                value={description}
                readOnly={readOnly}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What does this process handle?"
              />
            </header>

            <div className="ws-fms-flowchart">
              <div className="ws-fms-flow-start">
                <span className="ws-fms-flow-pill">Start</span>
                <p>Form submitted</p>
              </div>

              <div className="ws-fms-flow-connector" aria-hidden>
                <ArrowDown size={16} />
              </div>

              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className="ws-fms-flow-step-wrap"
                  data-flow-step-id={step.id}
                >
                  <FlowStepNode
                    step={step}
                    index={index}
                    members={members}
                    readOnly={readOnly}
                    onUpdate={(patch) => updateStep(step.id, patch)}
                    onRemove={() => removeStep(step.id)}
                    canRemove={steps.length > 1}
                  />
                  {index < steps.length - 1 ? (
                    <div className="ws-fms-flow-connector" aria-hidden>
                      <ArrowDown size={16} />
                    </div>
                  ) : null}
                </div>
              ))}

              {!readOnly ? (
                <button type="button" className="ws-fms-jf-add ws-fms-flow-add" onClick={addStep}>
                  <Plus size={14} aria-hidden />
                  Add step
                </button>
              ) : null}

              <div className="ws-fms-flow-connector" aria-hidden>
                <ArrowDown size={16} />
              </div>

              <div className="ws-fms-flow-end">
                <span className="ws-fms-flow-pill is-end">End</span>
                <p>Job complete</p>
              </div>
            </div>
          </div>

          {notifyOpen && !readOnly ? (
            <FmsNotificationsSettingsPanel
              alertConfig={alertConfig}
              onUpdate={(patch) =>
                setAlertConfig((prev) => ({ ...prev, ...patch }))
              }
              onClose={() => setNotifyOpen(false)}
            />
          ) : null}
        </div>

        {statusMessage ? (
          <p
            className={statusOk ? "saas-form-message ok" : "saas-form-message error"}
            role="alert"
          >
            {statusMessage}
          </p>
        ) : null}

        {!readOnly ? (
          <div className="form-actions ws-fms-jf-actions">
            <button
              type="submit"
              className="btn-secondary"
              disabled={savePending || submitPending}
            >
              {savePending
                ? "Saving..."
                : mode === "create"
                  ? "Create flowchart"
                  : "Save draft"}
            </button>
          </div>
        ) : null}
      </form>

      {!readOnly && mode === "edit" && designId ? (
        <form action={submitFormAction} className="ws-fms-flow-submit-form">
          <input type="hidden" name="designId" value={designId} />
          <input type="hidden" name="name" value={name} readOnly />
          <input type="hidden" name="description" value={description} readOnly />
          <input type="hidden" name="stepsJson" value={stepsJson} readOnly />
          <input type="hidden" name="holidayDatesJson" value={holidayDatesJson} readOnly />
          <input type="hidden" name="alertConfigJson" value={alertConfigJson} readOnly />
          <div className="form-actions ws-fms-jf-actions">
            <p className="ws-fms-jf-save-hint">
              Submit for owner approval. FMS form and workflow are created automatically on approval.
            </p>
            <button
              type="submit"
              className="btn-cta btn-primary"
              disabled={submitPending || savePending}
            >
              {submitPending ? "Submitting..." : "Submit for owner approval"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
