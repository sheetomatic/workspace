"use client";

import { Check, UserRound } from "lucide-react";
import type { FmsFlowchartStep } from "@/lib/fms/flow-design";
import {
  memberRoleLabel,
  type FmsAssignableMember,
} from "@/lib/fms/flow-owner-resolve";

type Member = FmsAssignableMember;

function ownerName(ownerUserId: string, members: Member[]) {
  if (!ownerUserId) {
    return "Unassigned";
  }
  const member = members.find((m) => m.id === ownerUserId);
  return member?.name ?? member?.email.split("@")[0] ?? "Assigned";
}

export function FmsFlowOwnerAssignPanel({
  steps,
  members,
  onUpdateStep,
  onConfirm,
  onDismiss,
}: {
  steps: FmsFlowchartStep[];
  members: Member[];
  onUpdateStep: (stepId: string, ownerUserId: string) => void;
  onConfirm: () => void;
  onDismiss?: () => void;
}) {
  const unassigned = steps.filter((step) => !step.ownerUserId.trim()).length;
  const uniqueOwners = new Set(
    steps.map((step) => step.ownerUserId).filter(Boolean),
  ).size;
  const allSameOwner = steps.length > 1 && uniqueOwners === 1;

  return (
    <section className="ws-fms-flow-owner-panel" aria-label="Confirm step owners">
      <header className="ws-fms-flow-owner-head">
        <div>
          <h3>
            <UserRound size={18} aria-hidden />
            Confirm step owners
          </h3>
          <p className="ws-fms-muted">
            AI built the workflow. Assign a different owner per step - like
            Pipefy/Kissflow approval chains.
          </p>
        </div>
        {onDismiss ? (
          <button type="button" className="ws-fms-flow-owner-dismiss" onClick={onDismiss}>
            Skip for now
          </button>
        ) : null}
      </header>

      {unassigned > 0 ? (
        <p className="ws-fms-flow-owner-alert" role="status">
          {unassigned} step{unassigned === 1 ? "" : "s"} still need an owner.
        </p>
      ) : allSameOwner ? (
        <p className="ws-fms-flow-owner-alert is-warning" role="status">
          All steps are assigned to the same person. Split owners if different
          teams handle each stage.
        </p>
      ) : null}

      <ol className="ws-fms-flow-owner-list">
        {steps.map((step, index) => (
          <li key={step.id} className="ws-fms-flow-owner-row">
            <div className="ws-fms-flow-owner-step">
              <span className="ws-fms-flow-owner-index">{index + 1}</span>
              <div>
                <strong>{step.stepName.trim() || `Step ${index + 1}`}</strong>
                {step.ownerRoleLabel ? (
                  <span className="ws-fms-flow-owner-role">{step.ownerRoleLabel}</span>
                ) : null}
              </div>
            </div>
            <label className="ws-fms-flow-owner-pick">
              <span className="sr-only">Owner for {step.stepName}</span>
              <select
                value={step.ownerUserId}
                onChange={(event) => onUpdateStep(step.id, event.target.value)}
              >
                <option value="">Select owner...</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({memberRoleLabel(member)})
                  </option>
                ))}
              </select>
            </label>
            <span className="ws-fms-flow-owner-current">
              {ownerName(step.ownerUserId, members)}
            </span>
          </li>
        ))}
      </ol>

      <div className="ws-fms-flow-owner-actions">
        <button
          type="button"
          className="btn-cta btn-primary"
          disabled={unassigned > 0}
          onClick={onConfirm}
        >
          <Check size={16} aria-hidden />
          Confirm owners
        </button>
      </div>
    </section>
  );
}
