"use client";

import { useActionState, useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { Settings2, UserRound, X } from "lucide-react";
import {
  createFmsFlowDesign,
  submitFmsFlowDesignForApproval,
  updateFmsFlowDesign,
} from "@/app/app/fms/design-actions";
import { FmsDesignLaunchPanel } from "@/components/saas/fms-design-launch-panel";
import { FmsDesignProvisionPanel } from "@/components/saas/fms-design-provision-panel";
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
  insertFlowchartStepAt,
  mapAiFlowToSteps,
  newFlowchartStep,
  reorderFlowchartStepAfter,
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
  members: initialMembers,
  mode = "create",
  canApprove = false,
  reviewNote,
  linkedFormId,
  linkedFormName,
  formNeedsSetup = false,
  justApproved = false,
  initialAiPrompt = "",
  autoBuildAi = false,
  canvasRef,
  onFlowStarted,
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
  initialAiPrompt?: string;
  autoBuildAi?: boolean;
  canvasRef?: RefObject<HTMLDivElement | null>;
  onFlowStarted?: () => void;
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
  const canEditFlow = !readOnly;
  const needsProvision = initialStatus === "APPROVED" && !linkedFormId;

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [memberList, setMemberList] = useState(initialMembers);
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
  const [ownerReviewOpen, setOwnerReviewOpen] = useState(false);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const internalCanvasRef = useRef<HTMLDivElement>(null);
  const flowCanvasRef = canvasRef ?? internalCanvasRef;
  const pendingScrollToStepId = useRef<string | null>(null);

  const hasFlow = steps.length > 0;
  const selectedStep = selectedStepId
    ? steps.find((step) => step.id === selectedStepId)
    : undefined;
  const selectedStepIndex = selectedStep
    ? steps.findIndex((step) => step.id === selectedStep.id)
    : -1;
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
            memberList.find((m) => m.id === s.ownerUserId)?.name ?? null,
          ownerRole: s.ownerRoleLabel ?? null,
          howInstructions: s.howInstructions,
          tatValue: Number(s.tatValue) || 1,
          tatUnit: s.tatUnit,
        })),
      }
    : undefined;

  function applyAiDraft(draft: ParsedFmsFlowDraft) {
    const mapped = mapAiFlowToSteps(draft, memberList);
    setName(draft.name);
    setDescription(draft.description);
    setSteps(mapped);
    setSelectedStepId(mapped[0]?.id ?? null);
    setOwnerReviewOpen(mapped.length > 0);
    onFlowStarted?.();
  }

  function updateStep(id: string, patch: Partial<FmsFlowchartStep>) {
    setSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, ...patch } : step)),
    );
  }

  function insertStepAt(index: number) {
    const step = newFlowchartStep();
    pendingScrollToStepId.current = step.id;
    setSteps((prev) => insertFlowchartStepAt(prev, index, step));
    setSelectedStepId(step.id);
    onFlowStarted?.();
  }

  function moveStepAfter(stepId: string, afterStepId: string | null) {
    setSteps((prev) => reorderFlowchartStepAfter(prev, stepId, afterStepId));
  }

  function openStepEditor(id: string) {
    setSelectedStepId(id);
    pendingScrollToStepId.current = id;
  }

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
  }, [steps, selectedStepId]);

  useEffect(() => {
    if (initialSteps.length > 0) {
      onFlowStarted?.();
    }
  }, [initialSteps.length, onFlowStarted]);

  return (
    <div className="ws-fms-design-shell">
      <header className="ws-fms-design-topbar">
        <div className="ws-fms-design-topbar-main">
          <FmsStatusBadge status={initialStatus} />
          {linkedFormId ? (
            <Link href={`/app/fms/forms/${linkedFormId}`} className="ws-fms-btn-quiet">
              Open live FMS
            </Link>
          ) : null}
        </div>
      </header>

      {reviewNote && initialStatus === "REJECTED" ? (
        <section className="ws-fms-design-card ws-fms-design-alert is-error">
          <strong>Owner feedback</strong>
          <p>{reviewNote}</p>
          <p className="ws-fms-muted">Edit the workflow below, then save and resubmit for approval.</p>
        </section>
      ) : null}

      {canApprove && initialStatus === "PENDING_APPROVAL" && designId ? (
        <FmsDesignApprovalPanel designId={designId} />
      ) : null}

      {needsProvision && designId ? (
        <FmsDesignProvisionPanel designId={designId} designName={name} />
      ) : null}

      {initialStatus === "APPROVED" && linkedFormId ? (
        <FmsDesignLaunchPanel
          formId={linkedFormId}
          formName={linkedFormName ?? name}
          formNeedsSetup={formNeedsSetup}
          justApproved={justApproved}
        />
      ) : null}

      {canEditFlow ? (
        <FmsFlowAiBar
          onReady={applyAiDraft}
          existingDraft={aiExistingDraft}
          compact={hasFlow || Boolean(initialAiPrompt)}
          initialPrompt={initialAiPrompt}
          autoBuildOnMount={autoBuildAi}
        />
      ) : null}

      {canEditFlow && ownerReviewOpen && hasFlow ? (
        <FmsFlowOwnerAssignPanel
          steps={steps}
          members={memberList}
          onMembersChange={setMemberList}
          onUpdateStep={(stepId, ownerUserId) => updateStep(stepId, { ownerUserId })}
          onConfirm={() => setOwnerReviewOpen(false)}
          onDismiss={() => setOwnerReviewOpen(false)}
        />
      ) : null}

      {notifyOpen && canEditFlow ? (
        <FmsNotificationsSettingsPanel
          alertConfig={alertConfig}
          onUpdate={(patch) =>
            setAlertConfig((prev) => ({ ...prev, ...patch }))
          }
          onClose={() => setNotifyOpen(false)}
        />
      ) : null}

      <form action={saveFormAction} className="ws-fms-design-form">
        {designId ? <input type="hidden" name="designId" value={designId} /> : null}
        <input type="hidden" name="stepsJson" value={stepsJson} readOnly />
        <input type="hidden" name="holidayDatesJson" value={holidayDatesJson} readOnly />
        <input type="hidden" name="alertConfigJson" value={alertConfigJson} readOnly />

        {canEditFlow || hasFlow ? (
          <section className="ws-fms-design-card ws-fms-design-meta">
            <input
              name="name"
              required
              className="ws-fms-design-title"
              value={name}
              readOnly={readOnly}
              onChange={(e) => setName(e.target.value)}
              placeholder="FMS flow name"
            />
            <input
              name="description"
              className="ws-fms-design-desc"
              value={description}
              readOnly={readOnly}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this process handle?"
            />
          </section>
        ) : null}

        {canEditFlow || hasFlow ? (
          <section
            className="ws-fms-design-card ws-fms-design-flow"
            ref={flowCanvasRef}
          >
            <FmsN8nFlowView
              steps={steps}
              members={memberList}
              readOnly={readOnly}
              selectedStepId={selectedStepId}
              onSelectStep={openStepEditor}
              onEditStep={openStepEditor}
              onInsertStepAt={canEditFlow ? insertStepAt : undefined}
            />
          </section>
        ) : (
          <p className="ws-fms-muted">No steps in this design.</p>
        )}

        {selectedStep && selectedStepIndex >= 0 && canEditFlow ? (
          <section
            className="ws-fms-design-card ws-fms-design-editor"
            ref={editorRef}
          >
            <div className="ws-fms-design-editor-head">
              <h2 className="ws-fms-design-card-title">
                Step {selectedStepIndex + 1}
              </h2>
              <button
                type="button"
                className="ws-fms-design-editor-done"
                onClick={() => setSelectedStepId(null)}
                aria-label="Done editing step"
              >
                <X size={16} aria-hidden />
                Done
              </button>
            </div>
            <div
              className="ws-fms-flow-manual-editor"
              data-flow-step-id={selectedStep.id}
            >
              <FlowStepNode
                step={selectedStep}
                index={selectedStepIndex}
                members={memberList}
                onMembersChange={setMemberList}
                readOnly={readOnly}
                allSteps={steps}
                onConnectAfter={(afterStepId) =>
                  moveStepAfter(selectedStep.id, afterStepId)
                }
                onUpdate={(patch) => updateStep(selectedStep.id, patch)}
                onRemove={() => removeStep(selectedStep.id)}
                canRemove={steps.length > 1}
              />
            </div>
          </section>
        ) : null}

        {statusMessage ? (
          <p
            className={statusOk ? "saas-form-message ok" : "saas-form-message error"}
            role="alert"
          >
            {statusMessage}
          </p>
        ) : null}

        {canEditFlow ? (
          <footer className="ws-fms-design-footer">
            <button
              type="button"
              className={`ws-fms-btn-quiet${notifyOpen ? " is-active" : ""}`}
              onClick={() => setNotifyOpen((open) => !open)}
              aria-label="Notification settings"
              title="Notification settings"
            >
              <Settings2 size={14} aria-hidden />
              Alerts
            </button>
            {hasFlow ? (
              <button
                type="button"
                className={`ws-fms-btn-quiet${ownerReviewOpen ? " is-active" : ""}`}
                onClick={() => setOwnerReviewOpen(true)}
              >
                <UserRound size={14} aria-hidden />
                Assign owners
              </button>
            ) : null}
            {hasFlow ? (
              <button
                type="submit"
                className="ws-fms-btn-quiet is-primary"
                disabled={savePending || submitPending}
              >
                {savePending
                  ? "Saving..."
                  : mode === "create"
                    ? "Create flowchart"
                    : "Save draft"}
              </button>
            ) : null}
          </footer>
        ) : null}
      </form>

      {canEditFlow && mode === "edit" && designId && hasFlow ? (
        <form action={submitFormAction} className="ws-fms-design-submit">
          <input type="hidden" name="designId" value={designId} />
          <input type="hidden" name="name" value={name} readOnly />
          <input type="hidden" name="description" value={description} readOnly />
          <input type="hidden" name="stepsJson" value={stepsJson} readOnly />
          <input type="hidden" name="holidayDatesJson" value={holidayDatesJson} readOnly />
          <input type="hidden" name="alertConfigJson" value={alertConfigJson} readOnly />
          <footer className="ws-fms-design-footer">
            <p className="ws-fms-muted">
              Submit for owner approval. Form and workflow are created after approval.
            </p>
            <button
              type="submit"
              className="ws-fms-btn-quiet is-primary"
              disabled={submitPending || savePending}
            >
              {submitPending ? "Submitting..." : "Submit for owner approval"}
            </button>
          </footer>
        </form>
      ) : null}
    </div>
  );
}
