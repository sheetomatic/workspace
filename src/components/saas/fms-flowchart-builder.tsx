"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Settings2 } from "lucide-react";
import {
  createFmsFlowDesign,
  submitFmsFlowDesignForApproval,
  updateFmsFlowDesign,
} from "@/app/app/fms/design-actions";
import { FmsDesignLaunchPanel } from "@/components/saas/fms-design-launch-panel";
import { FmsFlowOwnerAssignPanel } from "@/components/saas/fms-flow-owner-assign-panel";
import { FmsFlowAiBar } from "@/components/saas/fms-flow-ai-bar";
import { FmsN8nFlowView } from "@/components/saas/fms-n8n-flow-view";
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
  mapAiFlowToSteps,
  newFlowchartStep,
  parseFlowchartSteps,
  type FmsFlowchartStep,
} from "@/lib/fms/flow-design";
import type { FmsAssignableMember } from "@/lib/fms/flow-owner-resolve";
import type { ParsedFmsFlowDraft } from "@/lib/integrations/openai";
import type { FmsDesignStatus } from "@prisma/client";
import { FlowStepNode } from "@/components/saas/fms-flow-step-node";

type Member = FmsAssignableMember;

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
  linkedFormName,
  formNeedsSetup = false,
  justApproved = false,
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
  linkedFormName?: string | null;
  formNeedsSetup?: boolean;
  justApproved?: boolean;
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
    initialSteps.length > 0 ? initialSteps : [],
  );
  const [holidayDates] = useState<string[]>(() =>
    parseHolidayDates(initialHolidayDates),
  );
  const [alertConfig, setAlertConfig] = useState<FmsAlertConfig>(() =>
    parseAlertConfig(initialAlertConfig ?? DEFAULT_FMS_ALERT_CONFIG),
  );
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [ownerReviewOpen, setOwnerReviewOpen] = useState(false);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const pendingScrollToStepId = useRef<string | null>(null);

  const hasFlow = steps.length > 0;
  const stepsJson = JSON.stringify(steps);
  const holidayDatesJson = JSON.stringify(holidayDates);
  const alertConfigJson = JSON.stringify(alertConfig);
  const statusMessage = submitState.message || saveState.message;
  const statusOk = submitState.message ? submitState.ok : saveState.ok;

  const aiExistingDraft: ParsedFmsFlowDraft | undefined = hasFlow
    ? {
        name: name.trim() || "Untitled workflow",
        description: description.trim(),
        steps: steps.map((s) => ({
          stepName: s.stepName,
          ownerHint:
            members.find((m) => m.id === s.ownerUserId)?.name ?? null,
          ownerRole: s.ownerRoleLabel ?? null,
          howInstructions: s.howInstructions,
          tatValue: Number(s.tatValue) || 1,
          tatUnit: s.tatUnit,
        })),
      }
    : undefined;

  function applyAiDraft(draft: ParsedFmsFlowDraft) {
    const mapped = mapAiFlowToSteps(draft, members);
    setName(draft.name);
    setDescription(draft.description);
    setSteps(mapped);
    setEditMode(false);
    setSelectedStepId(null);
    setOwnerReviewOpen(mapped.length > 0);
  }

  function updateStep(id: string, patch: Partial<FmsFlowchartStep>) {
    setSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, ...patch } : step)),
    );
  }

  function addStep() {
    const step = newFlowchartStep("");
    pendingScrollToStepId.current = step.id;
    setSteps((prev) => [...prev, step]);
    setEditMode(true);
    setSelectedStepId(step.id);
  }

  function startManualEdit() {
    if (steps.length === 0) {
      const step = newFlowchartStep("");
      setSteps([step]);
      setSelectedStepId(step.id);
    }
    setEditMode(true);
  }

  useEffect(() => {
    const stepId = pendingScrollToStepId.current;
    if (!stepId || !editorRef.current) {
      return;
    }
    pendingScrollToStepId.current = null;
    const node = editorRef.current.querySelector(
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
    if (selectedStepId === id) {
      setSelectedStepId(null);
    }
  }

  return (
    <div className="ws-fms-flowchart-builder">
      <div className="ws-fms-flow-toolbar">
        <div className="ws-fms-flow-toolbar-main">
          <FmsStatusBadge status={initialStatus} />
          {linkedFormId && initialStatus !== "APPROVED" ? (
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

      {initialStatus === "APPROVED" && linkedFormId ? (
        <FmsDesignLaunchPanel
          formId={linkedFormId}
          formName={linkedFormName ?? name}
          formNeedsSetup={formNeedsSetup}
          justApproved={justApproved}
        />
      ) : null}

      {!readOnly ? (
        <FmsFlowAiBar
          onReady={applyAiDraft}
          existingDraft={aiExistingDraft}
          compact={hasFlow}
        />
      ) : null}

      {!readOnly && ownerReviewOpen && hasFlow ? (
        <FmsFlowOwnerAssignPanel
          steps={steps}
          members={members}
          onUpdateStep={(stepId, ownerUserId) => updateStep(stepId, { ownerUserId })}
          onConfirm={() => setOwnerReviewOpen(false)}
          onDismiss={() => setOwnerReviewOpen(false)}
        />
      ) : null}

      {notifyOpen && !readOnly ? (
        <FmsNotificationsSettingsPanel
          alertConfig={alertConfig}
          onUpdate={(patch) =>
            setAlertConfig((prev) => ({ ...prev, ...patch }))
          }
          onClose={() => setNotifyOpen(false)}
        />
      ) : null}

      <form action={saveFormAction} className="ws-fms-flow-form">
        {designId ? <input type="hidden" name="designId" value={designId} /> : null}
        <input type="hidden" name="stepsJson" value={stepsJson} readOnly />
        <input type="hidden" name="holidayDatesJson" value={holidayDatesJson} readOnly />
        <input type="hidden" name="alertConfigJson" value={alertConfigJson} readOnly />

        <div className="ws-fms-flow-layout">
          <div className="ws-fms-flow-main">
            {hasFlow ? (
              <>
                <header className="ws-fms-flow-header">
                  <input
                    name="name"
                    required
                    className="ws-fms-jf-title"
                    value={name}
                    readOnly={readOnly}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="FMS flow name"
                  />
                  <input
                    name="description"
                    className="ws-fms-jf-desc"
                    value={description}
                    readOnly={readOnly}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What does this process handle?"
                  />
                </header>

                <FmsN8nFlowView
                  steps={steps}
                  members={members}
                  readOnly={readOnly}
                  editMode={editMode}
                  selectedStepId={selectedStepId}
                  onToggleEdit={() => {
                    setEditMode((v) => !v);
                    if (editMode) {
                      setSelectedStepId(null);
                    }
                  }}
                  onAssignOwners={() => setOwnerReviewOpen(true)}
                  onSelectStep={setSelectedStepId}
                />

                {editMode && !readOnly ? (
                  <div className="ws-fms-flow-manual-editor" ref={editorRef}>
                    <p className="ws-fms-flow-manual-label">Edit step details</p>
                    {steps.map((step, index) => (
                      <div
                        key={step.id}
                        data-flow-step-id={step.id}
                        className={
                          selectedStepId && selectedStepId !== step.id
                            ? "ws-fms-flow-step-collapsed"
                            : undefined
                        }
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
                      </div>
                    ))}
                    <button
                      type="button"
                      className="ws-fms-jf-add ws-fms-flow-add"
                      onClick={addStep}
                    >
                      <Plus size={14} aria-hidden />
                      Add step
                    </button>
                  </div>
                ) : null}
              </>
            ) : !readOnly ? (
              <div className="ws-fms-flow-empty">
                <p>
                  Use voice or text above and AI will build your flowchart in seconds.
                </p>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={startManualEdit}
                >
                  Build manually instead
                </button>
              </div>
            ) : (
              <p className="ws-fms-muted">No steps in this design.</p>
            )}
          </div>
        </div>

        {statusMessage ? (
          <p
            className={statusOk ? "saas-form-message ok" : "saas-form-message error"}
            role="alert"
          >
            {statusMessage}
          </p>
        ) : null}

        {!readOnly && hasFlow ? (
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

      {!readOnly && mode === "edit" && designId && hasFlow ? (
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
