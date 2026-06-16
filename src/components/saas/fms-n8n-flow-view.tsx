"use client";

import { ArrowRight, Clock, Pencil, User, UserRound } from "lucide-react";
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

export function FmsN8nFlowView({
  steps,
  members,
  readOnly,
  editMode,
  onToggleEdit,
  onAssignOwners,
  selectedStepId,
  onSelectStep,
}: {
  steps: FmsFlowchartStep[];
  members: Member[];
  readOnly: boolean;
  editMode: boolean;
  onToggleEdit?: () => void;
  onAssignOwners?: () => void;
  selectedStepId?: string | null;
  onSelectStep?: (id: string) => void;
}) {
  if (steps.length === 0) {
    return null;
  }

  return (
    <div className="ws-fms-n8n-wrap">
      <div className="ws-fms-n8n-toolbar">
        <span className="ws-fms-muted">Workflow preview</span>
        <div className="ws-fms-n8n-toolbar-actions">
          {!readOnly && onAssignOwners ? (
            <button
              type="button"
              className="ws-fms-n8n-edit-btn"
              onClick={onAssignOwners}
            >
              <UserRound size={14} aria-hidden />
              Assign owners
            </button>
          ) : null}
          {!readOnly && onToggleEdit ? (
            <button
              type="button"
              className={`ws-fms-n8n-edit-btn${editMode ? " is-active" : ""}`}
              onClick={onToggleEdit}
            >
              <Pencil size={14} aria-hidden />
              {editMode ? "Done editing" : "Edit steps"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="ws-fms-n8n-canvas">
        <div className="ws-fms-n8n-node ws-fms-n8n-trigger">
          <span className="ws-fms-n8n-node-badge">Trigger</span>
          <strong>Form submitted</strong>
          <span className="ws-fms-n8n-node-sub">Starts the job</span>
        </div>

        {steps.map((step, index) => (
          <div key={step.id} className="ws-fms-n8n-segment">
            <div className="ws-fms-n8n-edge" aria-hidden>
              <ArrowRight size={18} />
            </div>
            <div
              role={editMode && !readOnly ? "button" : undefined}
              tabIndex={editMode && !readOnly ? 0 : undefined}
              className={`ws-fms-n8n-node ws-fms-n8n-step${
                selectedStepId === step.id ? " is-selected" : ""
              }${editMode && !readOnly ? " is-editable" : ""}`}
              onClick={() => editMode && !readOnly && onSelectStep?.(step.id)}
              onKeyDown={(event) => {
                if (!editMode || readOnly) {
                  return;
                }
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectStep?.(step.id);
                }
              }}
            >
              <span className="ws-fms-n8n-node-badge">Step {index + 1}</span>
              <strong>{step.stepName.trim() || `Step ${index + 1}`}</strong>
              {step.ownerRoleLabel ? (
                <span className="ws-fms-n8n-node-role">{step.ownerRoleLabel}</span>
              ) : null}
              <div className="ws-fms-n8n-meta">
                <span>
                  <User size={12} aria-hidden />
                  {ownerName(step, members)}
                </span>
                <span>
                  <Clock size={12} aria-hidden />
                  {tatLabel(step)}
                </span>
              </div>
              {step.howInstructions ? (
                <p className="ws-fms-n8n-how">{step.howInstructions}</p>
              ) : null}
            </div>
          </div>
        ))}

        <div className="ws-fms-n8n-segment">
          <div className="ws-fms-n8n-edge" aria-hidden>
            <ArrowRight size={18} />
          </div>
          <div className="ws-fms-n8n-node ws-fms-n8n-end">
            <span className="ws-fms-n8n-node-badge is-end">End</span>
            <strong>Job complete</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
