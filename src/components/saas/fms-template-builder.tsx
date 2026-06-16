"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { FmsSlaType } from "@prisma/client";
import {
  createFmsTemplate,
  updateFmsTemplate,
} from "@/app/app/fms/actions";
import { fmsInitialState } from "@/lib/fms-action-state";
import {
  FMS_SLA_TYPES,
  FMS_SLA_TYPE_LABELS,
  type FmsCaptureField,
  type FmsSlaConfig,
} from "@/lib/fms/constants";
import { slaSummary } from "@/lib/fms/step-display";

type Member = { id: string; name: string; email: string };

export type FmsStepDraft = {
  id: string;
  stepName: string;
  roleLabel: string;
  defaultOwnerUserId: string;
  slaType: FmsSlaType;
  slaDays: string;
  slaHours: string;
  atHour: string;
  atMinute: string;
  minusDays: string;
  allowMarkDone: boolean;
  allowUpload: boolean;
  allowNotes: boolean;
  captureFields: FmsCaptureField[];
};

function newStep(): FmsStepDraft {
  return {
    id: crypto.randomUUID(),
    stepName: "",
    roleLabel: "",
    defaultOwnerUserId: "",
    slaType: "TAT_CALENDAR_DAYS",
    slaDays: "1",
    slaHours: "24",
    atHour: "18",
    atMinute: "0",
    minusDays: "0",
    allowMarkDone: true,
    allowUpload: false,
    allowNotes: true,
    captureFields: [],
  };
}

function stepToDraft(
  step: {
    stepName: string;
    roleLabel: string | null;
    defaultOwnerUserId: string | null;
    slaType: FmsSlaType;
    slaConfig: unknown;
    allowMarkDone: boolean;
    allowUpload: boolean;
    allowNotes: boolean;
    captureFields: unknown;
  },
): FmsStepDraft {
  const cfg = (step.slaConfig ?? {}) as FmsSlaConfig;
  return {
    id: crypto.randomUUID(),
    stepName: step.stepName,
    roleLabel: step.roleLabel ?? "",
    defaultOwnerUserId: step.defaultOwnerUserId ?? "",
    slaType: step.slaType,
    slaDays: String(cfg.days ?? 1),
    slaHours: String(cfg.hours ?? 24),
    atHour: String(cfg.atHour ?? 18),
    atMinute: String(cfg.atMinute ?? 0),
    minusDays: String(cfg.minusDays ?? 0),
    allowMarkDone: step.allowMarkDone,
    allowUpload: step.allowUpload,
    allowNotes: step.allowNotes,
    captureFields: Array.isArray(step.captureFields)
      ? (step.captureFields as FmsCaptureField[])
      : [],
  };
}

function buildSlaConfig(step: FmsStepDraft): FmsSlaConfig {
  if (step.slaType === "TAT_CALENDAR_DAYS" || step.slaType === "SPECIFIC_TIME") {
    return {
      days: Number(step.slaDays) || 1,
      atHour: Number(step.atHour) || 18,
      atMinute: Number(step.atMinute) || 0,
    };
  }
  if (step.slaType === "TAT_WORKING_HOURS") {
    return { hours: Number(step.slaHours) || 24 };
  }
  if (step.slaType === "LEAD_TIME_MINUS") {
    return { minusDays: Number(step.minusDays) || 0 };
  }
  return {};
}

function ownerLabel(step: FmsStepDraft, members: Member[]) {
  if (!step.defaultOwnerUserId) {
    return "Unassigned";
  }
  const member = members.find((m) => m.id === step.defaultOwnerUserId);
  return member?.name ?? member?.email.split("@")[0] ?? "Assigned";
}

function StepEditor({
  step,
  index,
  members,
  expanded,
  onToggle,
  onUpdate,
  onRemove,
  canRemove,
}: {
  step: FmsStepDraft;
  index: number;
  members: Member[];
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (patch: Partial<FmsStepDraft>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const tatLabel = slaSummary(step.slaType, buildSlaConfig(step));
  const toggles = [
    step.allowMarkDone && "Mark done",
    step.allowUpload && "Upload",
    step.allowNotes && "Notes",
  ].filter(Boolean);

  return (
    <div
      className={`ws-fms-jf-field ws-fms-jf-step${expanded ? " is-expanded" : ""}`}
      onClick={onToggle}
    >
      <div
        className="ws-fms-jf-field-toolbar ws-fms-jf-step-toolbar"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="ws-fms-jf-step-index" aria-hidden>
          {index + 1}
        </span>
        <input
          className="ws-fms-jf-field-label"
          value={step.stepName}
          onChange={(event) => onUpdate({ stepName: event.target.value })}
          placeholder={`Step ${index + 1} name`}
          aria-label={`Step ${index + 1} name`}
        />
        <select
          className="ws-fms-jf-field-type ws-fms-jf-step-owner"
          value={step.defaultOwnerUserId}
          onChange={(event) =>
            onUpdate({ defaultOwnerUserId: event.target.value })
          }
          aria-label="Default owner"
        >
          <option value="">Unassigned</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </div>

      <div className="ws-fms-jf-step-preview">
        <span className="ws-fms-jf-preview-muted">
          {ownerLabel(step, members)} ÿ {tatLabel}
          {toggles.length > 0 ? ` ÿ ${toggles.join(", ")}` : ""}
        </span>
      </div>

      {expanded ? (
        <div
          className="ws-fms-jf-field-options ws-fms-jf-step-options"
          onClick={(event) => event.stopPropagation()}
        >
          <label className="ws-fms-jf-option-field">
            Role label
            <input
              value={step.roleLabel}
              onChange={(event) => onUpdate({ roleLabel: event.target.value })}
              placeholder="e.g. Legal team"
            />
          </label>

          <label className="ws-fms-jf-option-field">
            TAT / SLA type
            <select
              value={step.slaType}
              onChange={(event) =>
                onUpdate({ slaType: event.target.value as FmsSlaType })
              }
            >
              {FMS_SLA_TYPES.map((type) => (
                <option key={type} value={type}>
                  {FMS_SLA_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </label>

          {(step.slaType === "TAT_CALENDAR_DAYS" ||
            step.slaType === "SPECIFIC_TIME") && (
            <label className="ws-fms-jf-option-field">
              Working days
              <input
                type="number"
                min={0}
                value={step.slaDays}
                onChange={(event) => onUpdate({ slaDays: event.target.value })}
              />
            </label>
          )}

          {step.slaType === "TAT_WORKING_HOURS" && (
            <label className="ws-fms-jf-option-field">
              Hours
              <input
                type="number"
                min={1}
                value={step.slaHours}
                onChange={(event) => onUpdate({ slaHours: event.target.value })}
              />
            </label>
          )}

          {step.slaType === "SPECIFIC_TIME" && (
            <div className="ws-fms-jf-step-time-row">
              <label className="ws-fms-jf-option-field">
                Due hour (24h)
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={step.atHour}
                  onChange={(event) => onUpdate({ atHour: event.target.value })}
                />
              </label>
              <label className="ws-fms-jf-option-field">
                Due minute
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={step.atMinute}
                  onChange={(event) =>
                    onUpdate({ atMinute: event.target.value })
                  }
                />
              </label>
            </div>
          )}

          {step.slaType === "LEAD_TIME_MINUS" && (
            <label className="ws-fms-jf-option-field">
              Days before deadline
              <input
                type="number"
                min={0}
                value={step.minusDays}
                onChange={(event) => onUpdate({ minusDays: event.target.value })}
              />
            </label>
          )}

          <div className="ws-fms-jf-step-checks">
            <label className="ws-fms-jf-option-check">
              <input
                type="checkbox"
                checked={step.allowMarkDone}
                onChange={(event) =>
                  onUpdate({ allowMarkDone: event.target.checked })
                }
              />
              Allow mark done
            </label>
            <label className="ws-fms-jf-option-check">
              <input
                type="checkbox"
                checked={step.allowUpload}
                onChange={(event) =>
                  onUpdate({ allowUpload: event.target.checked })
                }
              />
              Allow file upload
            </label>
            <label className="ws-fms-jf-option-check">
              <input
                type="checkbox"
                checked={step.allowNotes}
                onChange={(event) =>
                  onUpdate({ allowNotes: event.target.checked })
                }
              />
              Allow notes
            </label>
          </div>

          <button
            type="button"
            className="ws-fms-jf-remove"
            onClick={onRemove}
            disabled={!canRemove}
          >
            <Trash2 size={14} aria-hidden />
            Remove step
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function FmsTemplateBuilder({
  formId,
  templateId,
  initialName = "",
  initialSteps = [],
  members,
  mode = "create",
  templateStatus,
}: {
  formId: string;
  templateId?: string;
  initialName?: string;
  initialSteps?: Parameters<typeof stepToDraft>[0][];
  members: Member[];
  mode?: "create" | "edit";
  templateStatus?: "DRAFT" | "ACTIVE" | "ARCHIVED";
}) {
  const action = mode === "create" ? createFmsTemplate : updateFmsTemplate;
  const [state, formAction, pending] = useActionState(action, fmsInitialState);
  const [name, setName] = useState(initialName);
  const [steps, setSteps] = useState<FmsStepDraft[]>(() =>
    initialSteps.length > 0 ? initialSteps.map(stepToDraft) : [newStep()],
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    () => steps[0]?.id ?? null,
  );

  function updateStep(id: string, patch: Partial<FmsStepDraft>) {
    setSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, ...patch } : step)),
    );
  }

  const validSteps = steps.filter((s) => s.stepName.trim());
  const canSubmit = name.trim().length > 0 && validSteps.length > 0;

  const stepsJson = JSON.stringify(
    validSteps.map((s) => ({
      stepName: s.stepName.trim(),
      roleLabel: s.roleLabel.trim() || undefined,
      defaultOwnerUserId: s.defaultOwnerUserId || undefined,
      slaType: s.slaType,
      slaConfig: buildSlaConfig(s),
      allowMarkDone: s.allowMarkDone,
      allowUpload: s.allowUpload,
      allowNotes: s.allowNotes,
      captureFields: s.captureFields,
    })),
  );

  return (
    <form
      action={formAction}
      className="ws-fms-template-builder ws-fms-jotform ws-fms-jf-workflow"
    >
      <input type="hidden" name="formId" value={formId} />
      {templateId ? (
        <input type="hidden" name="templateId" value={templateId} />
      ) : null}
      <input type="hidden" name="stepsJson" value={stepsJson} readOnly />

      <div className="ws-fms-jf-canvas ws-fms-jf-workflow-canvas">
        <header className="ws-fms-jf-header">
          <label className="ws-fms-jf-title-wrap">
            <span className="sr-only">Workflow name</span>
            <input
              name="name"
              required
              className="ws-fms-jf-title"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Workflow name"
            />
          </label>
          {mode === "edit" && templateStatus ? (
            <p className="ws-fms-jf-workflow-meta">
              {validSteps.length} step{validSteps.length === 1 ? "" : "s"} ÿ{" "}
              {templateStatus === "ACTIVE" ? "Live" : "Draft"}
            </p>
          ) : (
            <p className="ws-fms-jf-workflow-meta">
              Add steps with owners and turnaround time. Submitting the linked form
              starts a job through this pipeline.
            </p>
          )}
        </header>

        <div className="ws-fms-jf-divider" aria-hidden />

        <div className="ws-fms-jf-fields">
          {steps.length === 0 ? (
            <p className="ws-fms-jf-empty">Add your first workflow step below.</p>
          ) : (
            steps.map((step, index) => (
              <StepEditor
                key={step.id}
                step={step}
                index={index}
                members={members}
                expanded={step.id === selectedId}
                onToggle={() =>
                  setSelectedId((prev) =>
                    prev === step.id ? null : step.id,
                  )
                }
                onUpdate={(patch) => updateStep(step.id, patch)}
                onRemove={() => {
                  setSteps((prev) => {
                    const next =
                      prev.length <= 1
                        ? prev
                        : prev.filter((s) => s.id !== step.id);
                    if (selectedId === step.id) {
                      setSelectedId(next[0]?.id ?? null);
                    }
                    return next;
                  });
                }}
                canRemove={steps.length > 1}
              />
            ))
          )}
        </div>

        <div className="ws-fms-jf-add-wrap">
          <button
            type="button"
            className="ws-fms-jf-add"
            onClick={() => {
              const step = newStep(steps.length);
              setSteps((prev) => [...prev, step]);
              setSelectedId(step.id);
            }}
          >
            <Plus size={14} aria-hidden />
            Add step
          </button>
        </div>
      </div>

      {state.message ? (
        <p
          className={
            state.ok ? "saas-form-message ok" : "saas-form-message error"
          }
          role="alert"
        >
          {state.message}
        </p>
      ) : null}

      <div className="form-actions ws-fms-jf-actions">
        {!canSubmit && validSteps.length > 0 && !name.trim() ? (
          <p className="ws-fms-jf-save-hint">Enter a workflow name to save.</p>
        ) : null}
        <button
          type="submit"
          className="btn-cta btn-primary"
          disabled={pending || !canSubmit}
        >
          {pending
            ? "Saving..."
            : mode === "create"
              ? "Save workflow"
              : "Save workflow"}
        </button>
        <button
          type="submit"
          name="activate"
          value="1"
          className="btn-secondary"
          disabled={pending || !canSubmit}
        >
          {mode === "create" ? "Save & go live" : "Save & go live"}
        </button>
      </div>
    </form>
  );
}
