"use client";

import { useActionState } from "react";
import { claimFmsStepAction } from "@/app/app/fms/workflow-actions";
import { fmsInitialState } from "@/lib/fms-action-state";

export function FmsClaimStepBanner({
  instanceId,
  stepStateId,
}: {
  instanceId: string;
  stepStateId: string;
}) {
  const [state, action, pending] = useActionState(
    claimFmsStepAction,
    fmsInitialState,
  );

  return (
    <div className="ws-fms-claim-banner">
      <p>
        This stop has no owner. Claim it to mark done and move the pipeline forward.
      </p>
      <form action={action} className="ws-fms-claim-form">
        <input type="hidden" name="instanceId" value={instanceId} />
        <input type="hidden" name="stepStateId" value={stepStateId} />
        <button className="btn-primary btn-sm" disabled={pending} type="submit">
          {pending ? "Claiming..." : "Claim this stop"}
        </button>
      </form>
      {state.message ? (
        <p className={state.ok ? "ws-form-success" : "ws-form-error"}>{state.message}</p>
      ) : null}
    </div>
  );
}
