"use client";

import { Clock, Plus, Settings2, User } from "lucide-react";
import type { FmsFlowchartStep } from "@/lib/fms/flow-design";

type Member = { id: string; name: string; email: string };

function ownerName(step: FmsFlowchartStep, members: Member[]) {
  if (!step.ownerUserId) {
    return "Unassigned";
  }
  const member = members.find((m) => m.id === step.ownerUserId);
  return member?.name ?? member?.email.split("@")[0] ?? "Assigned";
}

function tatLabel(step: FmsFlowchartStep) {
  const n = step.tatValue || "1";
  return step.tatUnit === "hours"
    ? `${n} hr${n === "1" ? "" : "s"}`
    : `${n} day${n === "1" ? "" : "s"}`;
}

function N8nConnector({
  showAdd,
  onAdd,
}: {
  showAdd: boolean;
  onAdd?: () => void;
}) {
  return (
    <div className="ws-fms-n8n-edge" aria-hidden={!showAdd && false}>
      <span className="ws-fms-n8n-edge-line" />
      {showAdd && onAdd ? (
        <button
          type="button"
          className="ws-fms-n8n-add-btn"
          onClick={(event) => {
            event.stopPropagation();
            onAdd();
          }}
          aria-label="Add step"
          title="Add step"
        >
          <Plus size={13} strokeWidth={2.5} aria-hidden />
        </button>
      ) : (
        <span className="ws-fms-n8n-edge-dot" />
      )}
    </div>
  );
}

export function FmsN8nFlowView({
  steps,
  members,
  readOnly,
  selectedStepId,
  onSelectStep,
  onEditStep,
  onInsertStepAt,
}: {
  steps: FmsFlowchartStep[];
  members: Member[];
  readOnly: boolean;
  selectedStepId?: string | null;
  onSelectStep?: (id: string) => void;
  onEditStep?: (id: string) => void;
  /** Insert at pipeline index (0 = after trigger, before current step 1). */
  onInsertStepAt?: (index: number) => void;
}) {
  const canWire = !readOnly && Boolean(onInsertStepAt);
  const canEdit = !readOnly && Boolean(onEditStep);

  function openStep(id: string) {
    onSelectStep?.(id);
    onEditStep?.(id);
  }

  return (
    <div className="ws-fms-n8n-wrap">
      <div className="ws-fms-n8n-head">
        <h2 className="ws-fms-design-card-title">Workflow</h2>
        {canWire ? (
          <p className="ws-fms-n8n-head-hint">
            Tap <span className="ws-fms-n8n-hint-plus">+</span> on a wire to add a
            step. Tap <Settings2 size={11} className="ws-fms-n8n-hint-gear" aria-hidden />{" "}
            on a step to edit.
          </p>
        ) : null}
      </div>

      <div className="ws-fms-n8n-canvas-shell">
        <div className="ws-fms-n8n-canvas" role="list" aria-label="Workflow steps">
          <div className="ws-fms-n8n-segment" role="listitem">
            <div className="ws-fms-n8n-node ws-fms-n8n-trigger">
              <span className="ws-fms-n8n-node-badge">Trigger</span>
              <strong>Form submitted</strong>
              <span className="ws-fms-n8n-node-sub">Starts the job</span>
            </div>
            <N8nConnector
              showAdd={canWire}
              onAdd={() => onInsertStepAt?.(0)}
            />
          </div>

          {steps.map((step, index) => (
            <div key={step.id} className="ws-fms-n8n-segment" role="listitem">
              <div
                role={!readOnly ? "button" : undefined}
                tabIndex={!readOnly ? 0 : undefined}
                className={`ws-fms-n8n-node ws-fms-n8n-step${
                  selectedStepId === step.id ? " is-selected" : ""
                }${!readOnly ? " is-editable" : ""}`}
                onClick={() => !readOnly && openStep(step.id)}
                onKeyDown={(event) => {
                  if (readOnly) {
                    return;
                  }
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openStep(step.id);
                  }
                }}
              >
                {canEdit ? (
                  <button
                    type="button"
                    className="ws-fms-n8n-step-gear"
                    aria-label={`Edit step ${index + 1}`}
                    title="Edit step"
                    onClick={(event) => {
                      event.stopPropagation();
                      openStep(step.id);
                    }}
                  >
                    <Settings2 size={14} aria-hidden />
                  </button>
                ) : null}
                <div className="ws-fms-n8n-node-top">
                  <span className="ws-fms-n8n-node-badge">Step {index + 1}</span>
                  <strong>{step.stepName.trim() || `Step ${index + 1}`}</strong>
                </div>
                <div className="ws-fms-n8n-meta">
                  <span>
                    <User size={11} aria-hidden />
                    {ownerName(step, members)}
                  </span>
                  <span>
                    <Clock size={11} aria-hidden />
                    {tatLabel(step)}
                  </span>
                </div>
                {step.howInstructions ? (
                  <p className="ws-fms-n8n-how" title={step.howInstructions}>
                    {step.howInstructions}
                  </p>
                ) : null}
              </div>
              <N8nConnector
                showAdd={canWire}
                onAdd={() => onInsertStepAt?.(index + 1)}
              />
            </div>
          ))}

          <div className="ws-fms-n8n-node ws-fms-n8n-end" role="listitem">
            <span className="ws-fms-n8n-node-badge is-end">End</span>
            <strong>Job complete</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
