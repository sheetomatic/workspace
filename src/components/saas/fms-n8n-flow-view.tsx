"use client";

import { ArrowRight, Clock, Pencil, User } from "lucide-react";
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
  selectedStepId,
  onSelectStep,
}: {
  steps: FmsFlowchartStep[];
  members: Member[];
  readOnly: boolean;
  editMode: boolean;
  onToggleEdit?: () => void;
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
            <button
              type="button"
              className={`ws-fms-n8n-node ws-fms-n8n-step${
                selectedStepId === step.id ? " is-selected" : ""
              }${editMode ? " is-editable" : ""}`}
              onClick={() => editMode && onSelectStep?.(step.id)}
              disabled={!editMode || readOnly}
            >
              <span className="ws-fms-n8n-node-badge">Step {index + 1}</span>
              <strong>{step.stepName.trim() || `Step ${index + 1}`}</strong>
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
            </button>
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
