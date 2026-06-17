"use client";

import { useActionState } from "react";
import type { FmsInstanceStatus, FmsStepStatus } from "@prisma/client";
import {
  cancelFmsInstanceAction,
  reassignFmsStepAction,
  skipFmsStepAction,
} from "@/app/app/fms/workflow-actions";
import { fmsInitialState } from "@/lib/fms-action-state";

type MemberOption = {
  id: string;
  name: string | null;
  email: string;
};

type ActiveStep = {
  id: string;
  status: FmsStepStatus;
  ownerUserId: string | null;
  step: { stepName: string };
  owner: { id: string; name: string | null; email: string } | null;
};

export function FmsInstanceControlPanel({
  instanceId,
  instanceStatus,
  activeStep,
  members,
}: {
  instanceId: string;
  instanceStatus: FmsInstanceStatus;
  activeStep: ActiveStep | null;
  members: MemberOption[];
}) {
  const [skipState, skipAction, skipPending] = useActionState(
    skipFmsStepAction,
    fmsInitialState,
  );
  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelFmsInstanceAction,
    fmsInitialState,
  );
  const [reassignState, reassignAction, reassignPending] = useActionState(
    reassignFmsStepAction,
    fmsInitialState,
  );

  if (instanceStatus !== "ACTIVE") {
    return null;
  }

  const ownerLabel = (member: MemberOption) =>
    member.name ?? member.email.split("@")[0];

  return (
    <section className="ws-sf-card ws-fms-control-panel">
      <header className="ws-fms-section-heading">
        <h2>Pipeline controls</h2>
        <p>Manager actions for exceptions on this job.</p>
      </header>

      {activeStep ? (
        <>
          <p className="ws-fms-muted">
            Active step: <strong>{activeStep.step.stepName}</strong>
            {activeStep.owner
              ? ` | Owner: ${activeStep.owner.name ?? activeStep.owner.email.split("@")[0]}`
              : " | Unassigned"}
          </p>

          <form action={reassignAction} className="ws-fms-control-form">
            <input type="hidden" name="instanceId" value={instanceId} />
            <input type="hidden" name="stepStateId" value={activeStep.id} />
            <label>
              <span>Reassign owner</span>
              <select
                name="newOwnerUserId"
                defaultValue={activeStep.ownerUserId ?? ""}
                required
              >
                <option value="" disabled>
                  Select owner
                </option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {ownerLabel(member)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="btn-secondary btn-sm"
              disabled={reassignPending}
            >
              {reassignPending ? "Updating..." : "Reassign & notify"}
            </button>
            {reassignState.message ? (
              <p className={reassignState.ok ? "ws-form-success" : "ws-form-error"}>
                {reassignState.message}
              </p>
            ) : null}
          </form>

          <form action={skipAction} className="ws-fms-control-form">
            <input type="hidden" name="instanceId" value={instanceId} />
            <input type="hidden" name="stepStateId" value={activeStep.id} />
            <label>
              <span>Skip active step</span>
              <input
                name="reason"
                type="text"
                placeholder="Optional reason"
              />
            </label>
            <button
              type="submit"
              className="btn-secondary btn-sm"
              disabled={skipPending}
            >
              {skipPending ? "Skipping..." : "Skip step & move forward"}
            </button>
            {skipState.message ? (
              <p className={skipState.ok ? "ws-form-success" : "ws-form-error"}>
                {skipState.message}
              </p>
            ) : null}
          </form>
        </>
      ) : (
        <p className="ws-fms-muted">No active step on this job.</p>
      )}

      <form action={cancelAction} className="ws-fms-control-form is-danger">
        <input type="hidden" name="instanceId" value={instanceId} />
        <p className="ws-fms-muted">
          Cancel stops the job. Completed steps stay on record; no further steps run.
        </p>
        <button
          type="submit"
          className="btn-secondary btn-sm ws-fms-btn-danger"
          disabled={cancelPending}
          onClick={(event) => {
            if (
              !window.confirm(
                "Cancel this job? It will be removed from active pipelines.",
              )
            ) {
              event.preventDefault();
            }
          }}
        >
          {cancelPending ? "Cancelling..." : "Cancel job"}
        </button>
        {cancelState.message ? (
          <p className={cancelState.ok ? "ws-form-success" : "ws-form-error"}>
            {cancelState.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
