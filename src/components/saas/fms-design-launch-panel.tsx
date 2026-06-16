"use client";

import Link from "next/link";
import { ArrowRight, FileText, Play } from "lucide-react";

export function FmsDesignLaunchPanel({
  formId,
  formName,
  formNeedsSetup,
  justApproved = false,
}: {
  formId: string;
  formName: string;
  formNeedsSetup: boolean;
  justApproved?: boolean;
}) {
  const formHref = `/app/fms/forms/${formId}?setup=form`;
  const submitHref = `/app/fms/forms/${formId}/submit`;

  return (
    <section className="ws-fms-design-card ws-fms-design-launch" aria-label="Next steps after approval">
      <div className="ws-fms-design-card-head">
        <div>
          <h2>{justApproved ? "Live FMS created" : "Live FMS - next steps"}</h2>
          <p className="ws-fms-muted">
            {formNeedsSetup
              ? "Generate intake fields with AI, then submit the first job."
              : "Review the form, then submit the first job to start the flow."}
          </p>
        </div>
      </div>

      <div className="ws-fms-design-launch-grid">
        <div className={`ws-fms-design-launch-item${formNeedsSetup ? " is-active" : " is-done"}`}>
          <span className="ws-fms-design-launch-num">1</span>
          <div>
            <strong>Create intake form</strong>
            <p className="ws-fms-muted">
              {formNeedsSetup
                ? `AI builds fields for ${formName}.`
                : "Form fields are ready - open to review or refine."}
            </p>
            <Link href={formHref} className="ws-fms-btn-quiet is-primary">
              <FileText size={14} aria-hidden />
              {formNeedsSetup ? "Create form with AI" : "Open intake form"}
              <ArrowRight size={12} aria-hidden />
            </Link>
          </div>
        </div>

        <div className={`ws-fms-design-launch-item${formNeedsSetup ? "" : " is-active"}`}>
          <span className="ws-fms-design-launch-num">2</span>
          <div>
            <strong>Start flow</strong>
            <p className="ws-fms-muted">
              Submit the first request - it runs through every workflow step.
            </p>
            {formNeedsSetup ? (
              <span className="ws-fms-btn-quiet is-disabled" aria-disabled="true">
                <Play size={14} aria-hidden />
                Submit first job
              </span>
            ) : (
              <Link href={submitHref} className="ws-fms-btn-quiet">
                <Play size={14} aria-hidden />
                Submit first job
                <ArrowRight size={12} aria-hidden />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
