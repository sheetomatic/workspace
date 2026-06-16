"use client";

import { useActionState } from "react";
import {
  approveFmsFlowDesign,
  rejectFmsFlowDesign,
} from "@/app/app/fms/design-actions";
import { fmsInitialState } from "@/lib/fms-action-state";

export function FmsDesignApprovalPanel({ designId }: { designId: string }) {
  const [approveState, approveAction, approvePending] = useActionState(
    approveFmsFlowDesign,
    fmsInitialState,
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectFmsFlowDesign,
    fmsInitialState,
  );

  const message = approveState.message || rejectState.message;
  const ok = approveState.message ? approveState.ok : rejectState.ok;

  return (
    <section className="ws-fms-approval-panel">
      <h3>Owner approval required</h3>
      <p className="ws-fms-muted">
        Review the flowchart below. On approval, Sheetomatic will auto-create the intake form and live FMS workflow.
      </p>

      {message ? (
        <p className={ok ? "saas-form-message ok" : "saas-form-message error"} role="alert">
          {message}
        </p>
      ) : null}

      <div className="ws-fms-approval-actions">
        <form action={approveAction}>
          <input type="hidden" name="designId" value={designId} />
          <button
            type="submit"
            className="btn-cta btn-primary"
            disabled={approvePending || rejectPending}
          >
            {approvePending ? "Approving..." : "Approve and create FMS"}
          </button>
        </form>

        <form action={rejectAction} className="ws-fms-reject-form">
          <input type="hidden" name="designId" value={designId} />
          <label className="ws-fms-jf-option-field">
            Feedback (optional)
            <input
              name="reviewNote"
              placeholder="What should change before approval?"
            />
          </label>
          <button
            type="submit"
            className="btn-secondary ws-fms-reject-btn"
            disabled={approvePending || rejectPending}
          >
            {rejectPending ? "Rejecting..." : "Reject"}
          </button>
        </form>
      </div>
    </section>
  );
}
