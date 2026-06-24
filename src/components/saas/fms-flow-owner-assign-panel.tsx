"use client";

import { Check, UserRound } from "lucide-react";
import type { FmsFlowchartStep } from "@/lib/fms/flow-design";
import {
  FmsStepOwnerField,
  type FmsStepOwnerMember,
} from "@/components/saas/fms-step-owner-field";

type Member = FmsStepOwnerMember;

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
  onMembersChange,
  onUpdateStep,
  onConfirm,
  onDismiss,
}: {
  steps: FmsFlowchartStep[];
  members: Member[];
  onMembersChange: (members: Member[]) => void;
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
            Assign step owners
          </h3>
          <p className="ws-fms-muted">
            Pick who owns each stop. If someone is not in your team yet, add them
            here and set TAT on each step.
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
          {unassigned} step{unassigned === 1 ? "" : "s"} still need a step owner.
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
                <span className="ws-fms-flow-owner-tat">
                  TAT: {step.tatValue} {step.tatUnit.replaceAll("_", " ").toLowerCase()}
                </span>
              </div>
            </div>
            <div className="ws-fms-flow-owner-pick">
              <FmsStepOwnerField
                compact
                label="Step owner"
                members={members}
                value={step.ownerUserId}
                onChange={(userId) => onUpdateStep(step.id, userId)}
                onMembersChange={onMembersChange}
              />
            </div>
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
          Confirm step owners
        </button>
      </div>
    </section>
  );
}
