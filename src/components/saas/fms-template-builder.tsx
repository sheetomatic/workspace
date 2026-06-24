"use client";

import { useActionState, useState } from "react";
import { Plus, Settings2, Trash2, X } from "lucide-react";
import type { FmsSlaType } from "@prisma/client";
import {
  createFmsTemplate,
  updateFmsTemplate,
} from "@/app/app/fms/actions";
import { fmsInitialState } from "@/lib/fms-action-state";
import {
  parseHolidayDates,
  parseAlertConfig,
  type FmsAlertConfig,
  type FmsCaptureField,
  type FmsSlaConfig,
} from "@/lib/fms/constants";
import { slaSummary } from "@/lib/fms/step-display";
import { FmsStepSettingsPanel } from "@/components/saas/fms-step-settings-panel";
import type { FmsStepOwnerMember } from "@/components/saas/fms-step-owner-field";

type Member = FmsStepOwnerMember;

export type FmsStepDraft = {
  id: string;
  stepName: string;
  roleLabel: string;
  instructions: string;
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

const EXAMPLE_STEPS = ["Filing", "Examination", "Registration"];

function newStep(): FmsStepDraft {
  return {
    id: crypto.randomUUID(),
    stepName: "",
    roleLabel: "",
    instructions: "",
    defaultOwnerUserId: "",
    slaType: "TAT_CALENDAR_DAYS",
    slaDays: "1",
    slaHours: "24",
    atHour: "18",
    atMinute: "0",
    minusDays: "0",
    allowMarkDone: true,
    allowUpload: true,
    allowNotes: true,
    captureFields: [],
  };
}

function stepToDraft(
  step: {
    stepName: string;
    roleLabel: string | null;
    instructions: string | null;
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
    instructions: step.instructions ?? "",
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

function formatHolidayLabel(isoDate: string) {
  const date = new Date(`${isoDate}T12:00:00`);
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function StepEditor({
  step,
  index,
  members,
  selected,
  onSelect,
  onUpdate,
  onRemove,
  canRemove,
}: {
  step: FmsStepDraft;
  index: number;
  members: Member[];
  selected: boolean;
  onSelect: () => void;
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
      className={`ws-fms-jf-field ws-fms-jf-step${selected ? " is-selected" : ""}`}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("button, input, select, textarea, label, a")) {
          return;
        }
        onSelect();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          const target = event.target as HTMLElement;
          if (target.closest("button, input, select, textarea, label, a")) {
            return;
          }
          event.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="ws-fms-jf-field-row ws-fms-jf-step-row">
        <span className="ws-fms-jf-step-index" aria-hidden>
          {index + 1}
        </span>
        <div className="ws-fms-jf-field-main">
          <input
            className="ws-fms-jf-field-label"
            value={step.stepName}
            onChange={(event) => onUpdate({ stepName: event.target.value })}
            placeholder={`Step ${index + 1} name`}
            aria-label={`Step ${index + 1} name`}
          />
          <div className="ws-fms-jf-step-preview">
            <span className="ws-fms-jf-preview-muted">
              {ownerLabel(step, members)} · {tatLabel}
              {toggles.length > 0 ? ` · ${toggles.join(", ")}` : ""}
            </span>
          </div>
        </div>
        <div className="ws-fms-jf-field-actions">
          <button
            type="button"
            className={`ws-fms-jf-gear${selected ? " is-active" : ""}`}
            aria-label="Step settings"
            onClick={onSelect}
          >
            <Settings2 size={16} aria-hidden />
          </button>
          <button
            type="button"
            className="ws-fms-jf-gear ws-fms-jf-trash"
            aria-label="Remove step"
            title="Remove step"
            onClick={onRemove}
            disabled={!canRemove}
          >
            <Trash2 size={16} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

export function FmsTemplateBuilder({
  formId,
  templateId,
  initialName = "",
  initialSteps = [],
  initialHolidayDates = [],
  initialAlertConfig,
  members: initialMembers,
  mode = "create",
  templateStatus,
}: {
  formId: string;
  templateId?: string;
  initialName?: string;
  initialSteps?: Parameters<typeof stepToDraft>[0][];
  initialHolidayDates?: unknown;
  initialAlertConfig?: unknown;
  members: Member[];
  mode?: "create" | "edit";
  templateStatus?: "DRAFT" | "ACTIVE" | "ARCHIVED";
}) {
  const action = mode === "create" ? createFmsTemplate : updateFmsTemplate;
  const [state, formAction, pending] = useActionState(action, fmsInitialState);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [name, setName] = useState(initialName);
  const [steps, setSteps] = useState<FmsStepDraft[]>(() =>
    initialSteps.length > 0 ? initialSteps.map(stepToDraft) : [newStep()],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [holidayDates, setHolidayDates] = useState<string[]>(() =>
    parseHolidayDates(initialHolidayDates),
  );
  const [holidayInput, setHolidayInput] = useState("");
  const [alertConfig, setAlertConfig] = useState<FmsAlertConfig>(() =>
    parseAlertConfig(initialAlertConfig),
  );

  function updateAlertConfig(patch: Partial<FmsAlertConfig>) {
    setAlertConfig((prev) => ({ ...prev, ...patch }));
  }

  function updateStep(id: string, patch: Partial<FmsStepDraft>) {
    setSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, ...patch } : step)),
    );
  }

  function addHoliday() {
    const value = holidayInput.trim();
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return;
    }
    setHolidayDates((prev) =>
      prev.includes(value) ? prev : [...prev, value].sort(),
    );
    setHolidayInput("");
  }

  function removeHoliday(date: string) {
    setHolidayDates((prev) => prev.filter((item) => item !== date));
  }

  function loadExampleSteps() {
    setSteps(
      EXAMPLE_STEPS.map((stepName) => ({
        ...newStep(),
        stepName,
        slaDays: "3",
      })),
    );
    setSelectedId(null);
  }

  const validSteps = steps.filter((s) => s.stepName.trim());
  const canSubmit = name.trim().length > 0 && validSteps.length > 0;

  const stepsJson = JSON.stringify(
    validSteps.map((s) => ({
      stepName: s.stepName.trim(),
      roleLabel: s.roleLabel.trim() || undefined,
      instructions: s.instructions.trim() || undefined,
      defaultOwnerUserId: s.defaultOwnerUserId || undefined,
      slaType: s.slaType,
      slaConfig: buildSlaConfig(s),
      allowMarkDone: s.allowMarkDone,
      allowUpload: s.allowUpload,
      allowNotes: s.allowNotes,
      captureFields: s.captureFields,
    })),
  );

  const holidayDatesJson = JSON.stringify(holidayDates);
  const alertConfigJson = JSON.stringify(alertConfig);
  const selectedStep = steps.find((step) => step.id === selectedId) ?? null;

  return (
    <div className="ws-fms-form-builder ws-fms-template-builder-wrap">
    <form
      action={formAction}
      className="ws-fms-form-builder-form ws-fms-template-builder ws-fms-jotform ws-fms-jf-workflow ws-fms-jf-scroll-shell"
    >
      <input type="hidden" name="formId" value={formId} />
      {templateId ? (
        <input type="hidden" name="templateId" value={templateId} />
      ) : null}
      <input type="hidden" name="stepsJson" value={stepsJson} readOnly />
      <input
        type="hidden"
        name="holidayDatesJson"
        value={holidayDatesJson}
        readOnly
      />
      <input
        type="hidden"
        name="alertConfigJson"
        value={alertConfigJson}
        readOnly
      />

      <div className="ws-fms-jf-canvas ws-fms-jf-workflow-canvas">
        <header className="ws-fms-jf-header ws-fms-jf-sticky-header">
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
              {validSteps.length} step{validSteps.length === 1 ? "" : "s"} -{" "}
              {templateStatus === "ACTIVE" ? "Live" : "Draft"}
            </p>
          ) : (
            <p className="ws-fms-jf-workflow-meta">
              Add steps with owners and turnaround time. Submitting the linked form
              starts a job through this pipeline.
            </p>
          )}
          {mode === "create" && validSteps.length <= 1 && !validSteps[0]?.stepName ? (
            <div className="ws-fms-jf-workflow-example ws-fms-jf-workflow-example-inline">
              <p className="ws-fms-muted">
                Example (Trademark): {EXAMPLE_STEPS.join(" > ")}
              </p>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={loadExampleSteps}
              >
                Use example steps
              </button>
            </div>
          ) : null}
        </header>

        <div className="ws-fms-jf-divider" aria-hidden />

        <div className="ws-fms-jf-builder-split">
          <div className="ws-fms-jf-fields-scroll">
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
                    selected={step.id === selectedId}
                    onSelect={() =>
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
                          setSelectedId(null);
                        }
                        return next;
                      });
                    }}
                    canRemove={steps.length > 1}
                  />
                ))
              )}
            </div>

            <section className="ws-fms-jf-planning">
              <h3>Plan dates</h3>
              <p className="ws-fms-muted">
                Choose how planned due dates appear on the live pipeline grid.
              </p>
              <div className="ws-fms-jf-planning-options">
                <label className="ws-fms-jf-planning-option">
                  <input
                    checked={alertConfig.planMode === "AUTO_TAT_ALL"}
                    name="planMode"
                    type="radio"
                    onChange={() =>
                      setAlertConfig((current) => ({
                        ...current,
                        planMode: "AUTO_TAT_ALL",
                      }))
                    }
                  />
                  <span>
                    <strong>Auto plan from TAT (default)</strong>
                    <small>
                      When the first step is done, plan all remaining steps using
                      each step TAT.
                    </small>
                  </span>
                </label>
                <label className="ws-fms-jf-planning-option">
                  <input
                    checked={alertConfig.planMode === "ON_PREV_ACTUAL"}
                    name="planMode"
                    type="radio"
                    onChange={() =>
                      setAlertConfig((current) => ({
                        ...current,
                        planMode: "ON_PREV_ACTUAL",
                      }))
                    }
                  />
                  <span>
                    <strong>Plan on previous actual</strong>
                    <small>
                      Show the next step planned date only after the previous
                      step actual time is recorded.
                    </small>
                  </span>
                </label>
              </div>
            </section>

            <section className="ws-fms-jf-holidays">
            <h3>Holidays</h3>
            <p className="ws-fms-muted">
              TAT skips Sundays and these dates. Add public holidays or office
              closures for your team.
            </p>
            <div className="ws-fms-jf-holiday-add">
              <input
                type="date"
                value={holidayInput}
                onChange={(event) => setHolidayInput(event.target.value)}
                aria-label="Holiday date"
              />
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={addHoliday}
                disabled={!holidayInput}
              >
                Add holiday
              </button>
            </div>
            {holidayDates.length > 0 ? (
              <ul className="ws-fms-jf-holiday-list">
                {holidayDates.map((date) => (
                  <li key={date}>
                    <span>{formatHolidayLabel(date)}</span>
                    <button
                      type="button"
                      className="ws-fms-jf-holiday-remove"
                      onClick={() => removeHoliday(date)}
                      aria-label={`Remove ${date}`}
                    >
                      <X size={14} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ws-fms-jf-holiday-empty ws-fms-muted">
                No holidays added yet.
              </p>
            )}
          </section>

          <section className="ws-fms-jf-alerts">
            <h3>WhatsApp alerts</h3>
            <p className="ws-fms-muted">
              Notify step owners on WhatsApp when steps are assigned or due.
              Uses your workspace WhatsApp settings.
            </p>
            <div className="ws-fms-jf-step-checks">
              <label className="ws-fms-jf-option-check">
                <input
                  type="checkbox"
                  checked={alertConfig.whatsappEnabled}
                  onChange={(event) =>
                    updateAlertConfig({ whatsappEnabled: event.target.checked })
                  }
                />
                Enable WhatsApp alerts
              </label>
              <label className="ws-fms-jf-option-check">
                <input
                  type="checkbox"
                  checked={alertConfig.onAssign}
                  disabled={!alertConfig.whatsappEnabled}
                  onChange={(event) =>
                    updateAlertConfig({ onAssign: event.target.checked })
                  }
                />
                When step is assigned
              </label>
              <label className="ws-fms-jf-option-check">
                <input
                  type="checkbox"
                  checked={alertConfig.onDueComing}
                  disabled={!alertConfig.whatsappEnabled}
                  onChange={(event) =>
                    updateAlertConfig({ onDueComing: event.target.checked })
                  }
                />
                Due date coming
              </label>
              <label className="ws-fms-jf-option-field ws-fms-jf-alert-days">
                Days before due date
                <input
                  type="number"
                  min={0}
                  max={30}
                  disabled={
                    !alertConfig.whatsappEnabled || !alertConfig.onDueComing
                  }
                  value={alertConfig.dueComingDaysBefore}
                  onChange={(event) =>
                    updateAlertConfig({
                      dueComingDaysBefore: Number(event.target.value) || 0,
                    })
                  }
                />
              </label>
              <label className="ws-fms-jf-option-check">
                <input
                  type="checkbox"
                  checked={alertConfig.onSameDay}
                  disabled={!alertConfig.whatsappEnabled}
                  onChange={(event) =>
                    updateAlertConfig({ onSameDay: event.target.checked })
                  }
                />
                Same day reminder
              </label>
              <label className="ws-fms-jf-option-check">
                <input
                  type="checkbox"
                  checked={alertConfig.onOverdue}
                  disabled={!alertConfig.whatsappEnabled}
                  onChange={(event) =>
                    updateAlertConfig({ onOverdue: event.target.checked })
                  }
                />
                Overdue alert
              </label>
            </div>
          </section>
          </div>

          {selectedStep ? (
            <FmsStepSettingsPanel
              step={selectedStep}
              members={members}
              onMembersChange={setMembers}
              onUpdate={(patch) => updateStep(selectedStep.id, patch)}
              onRemove={() => {
                setSteps((prev) => {
                  const next =
                    prev.length <= 1
                      ? prev
                      : prev.filter((s) => s.id !== selectedStep.id);
                  setSelectedId(null);
                  return next;
                });
              }}
              onClose={() => setSelectedId(null)}
              canRemove={steps.length > 1}
            />
          ) : null}
        </div>

        <div className="ws-fms-jf-add-wrap ws-fms-jf-canvas-footer">
          <button
            type="button"
            className="ws-fms-jf-add"
            onClick={() => {
              const step = newStep();
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

      <div className="form-actions ws-fms-jf-actions ws-fms-jf-sticky-actions">
        {!canSubmit && validSteps.length > 0 && !name.trim() ? (
          <p className="ws-fms-jf-save-hint">Enter a workflow name to save.</p>
        ) : null}
        <button
          type="submit"
          className="btn-cta btn-primary"
          disabled={pending || !canSubmit}
        >
          {pending ? "Saving..." : "Save workflow"}
        </button>
        <button
          type="submit"
          name="activate"
          value="1"
          className="btn-secondary"
          disabled={pending || !canSubmit}
        >
          Save & go live
        </button>
      </div>
    </form>
    </div>
  );
}
