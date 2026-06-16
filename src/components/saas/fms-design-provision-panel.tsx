"use client";

import { useActionState } from "react";
import { FileText, Play } from "lucide-react";
import { provisionApprovedFmsDesign } from "@/app/app/fms/design-actions";
import { fmsInitialState } from "@/lib/fms-action-state";

export function FmsDesignProvisionPanel({
  designId,
  designName,
}: {
  designId: string;
  designName: string;
}) {
  const [state, formAction, pending] = useActionState(
    provisionApprovedFmsDesign,
    fmsInitialState,
  );

  return (
    <section className="ws-fms-design-card ws-fms-design-provision" aria-label="Create live FMS">
      <div className="ws-fms-design-card-head">
        <div>
          <h2>Approved - create live FMS</h2>
          <p className="ws-fms-muted">
            {designName} is approved but the intake form and workflow are not live yet.
            Create them now, then refine the form with AI.
          </p>
        </div>
      </div>
      <form action={formAction} className="ws-fms-design-actions">
        <input type="hidden" name="designId" value={designId} />
        <button
          type="submit"
          className="ws-fms-btn-quiet is-primary"
          disabled={pending}
        >
          <FileText size={14} aria-hidden />
          {pending ? "Creating..." : "Create form and workflow"}
        </button>
        <span className="ws-fms-design-action-hint ws-fms-muted">
          <Play size={12} aria-hidden />
          After creation, submit the first job to start the flow.
        </span>
      </form>
      {state.message ? (
        <p
          className={state.ok ? "saas-form-message ok" : "saas-form-message error"}
          role="alert"
        >
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
