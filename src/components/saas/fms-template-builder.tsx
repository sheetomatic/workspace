"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
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

function StepRow({
  step,
  index,
  members,
  onUpdate,
  onRemove,
  canRemove,
}: {
  step: FmsStepDraft;
  index: number;
  members: Member[];
  onUpdate: (patch: Partial<FmsStepDraft>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="ws-fms-step-row">
      <div className="ws-fms-step-row-main">
        <label className="ws-fms-step-name">
          <span className="sr-only">Step name</span>
          <input
            value={step.stepName}
            onChange={(event) => onUpdate({ stepName: event.target.value })}
            placeholder={`Step ${index + 1} name`}
            required={index === 0}
          />
        </label>

        <label className="ws-fms-step-owner">
          <span className="sr-only">Default owner</span>
          <select
            value={step.defaultOwnerUserId}
            onChange={(event) =>
              onUpdate({ defaultOwnerUserId: event.target.value })
            }
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="btn-ghost btn-sm ws-fms-field-remove"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Remove step ${index + 1}`}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <details className="ws-fms-field-details">
        <summary>TAT & options</summary>
        <div className="ws-fms-field-details-body ws-fms-step-details-body">
          <label>
            Role label
            <input
              value={step.roleLabel}
              onChange={(event) => onUpdate({ roleLabel: event.target.value })}
              placeholder="e.g. Legal team"
            />
          </label>

          <label>
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
            <label>
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
            <label>
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
            <>
              <label>
                Due hour (24h)
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={step.atHour}
                  onChange={(event) => onUpdate({ atHour: event.target.value })}
                />
              </label>
              <label>
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
            </>
          )}

          {step.slaType === "LEAD_TIME_MINUS" && (
            <label>
              Days before deadline
              <input
                type="number"
                min={0}
                value={step.minusDays}
                onChange={(event) => onUpdate({ minusDays: event.target.value })}
              />
            </label>
          )}

          <div className="ws-fms-step-checks">
            <label>
              <input
                type="checkbox"
                checked={step.allowMarkDone}
                onChange={(event) =>
                  onUpdate({ allowMarkDone: event.target.checked })
                }
              />
              Mark done
            </label>
            <label>
              <input
                type="checkbox"
                checked={step.allowUpload}
                onChange={(event) =>
                  onUpdate({ allowUpload: event.target.checked })
                }
              />
              Upload files
            </label>
            <label>
              <input
                type="checkbox"
                checked={step.allowNotes}
                onChange={(event) =>
                  onUpdate({ allowNotes: event.target.checked })
                }
              />
              Notes
            </label>
          </div>
        </div>
      </details>
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
}: {
  formId: string;
  templateId?: string;
  initialName?: string;
  initialSteps?: Parameters<typeof stepToDraft>[0][];
  members: Member[];
  mode?: "create" | "edit";
}) {
  const action = mode === "create" ? createFmsTemplate : updateFmsTemplate;
  const [state, formAction, pending] = useActionState(action, fmsInitialState);
  const [steps, setSteps] = useState<FmsStepDraft[]>(() =>
    initialSteps.length > 0 ? initialSteps.map(stepToDraft) : [newStep()],
  );

  function updateStep(id: string, patch: Partial<FmsStepDraft>) {
    setSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, ...patch } : step)),
    );
  }

  const stepsJson = JSON.stringify(
    steps
      .filter((s) => s.stepName.trim())
      .map((s) => ({
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
    <form action={formAction} className="ws-task-assign-card ws-fms-template-builder">
      <input type="hidden" name="formId" value={formId} />
      {templateId ? (
        <input type="hidden" name="templateId" value={templateId} />
      ) : null}
      <input type="hidden" name="stepsJson" value={stepsJson} readOnly />

      <section className="ws-form-section ws-form-section-first">
        <h4 className="ws-form-section-title">Workflow</h4>
        <div className="form-grid-premium">
          <label className="form-field-full">
            Name
            <input
              name="name"
              required
              defaultValue={initialName}
              placeholder="Trademark registration pipeline"
            />
          </label>
        </div>
      </section>

      <section className="ws-form-section">
        <div className="ws-fms-fields-head">
          <h4 className="ws-form-section-title">Steps</h4>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => setSteps((prev) => [...prev, newStep()])}
          >
            + Add step
          </button>
        </div>

        <div className="ws-fms-field-list">
          {steps.map((step, index) => (
            <StepRow
              key={step.id}
              step={step}
              index={index}
              members={members}
              onUpdate={(patch) => updateStep(step.id, patch)}
              onRemove={() =>
                setSteps((prev) =>
                  prev.length <= 1 ? prev : prev.filter((s) => s.id !== step.id),
                )
              }
              canRemove={steps.length > 1}
            />
          ))}
        </div>
      </section>

      {state.message ? (
        <p
          className={state.ok ? "saas-form-message ok" : "saas-form-message error"}
          role="alert"
        >
          {state.message}
        </p>
      ) : null}

      <div className="form-actions">
        <button
          type="submit"
          className="btn-cta btn-primary"
          disabled={pending}
        >
          {pending ? "Saving..." : mode === "create" ? "Create FMS" : "Update FMS"}
        </button>
        <button
          type="submit"
          name="activate"
          value="1"
          className="btn-secondary"
          disabled={pending}
        >
          {mode === "create" ? "Create & go live" : "Save & go live"}
        </button>
      </div>
    </form>
  );
}
