"use client";

import Link from "next/link";
import { ArrowRight, FileText, Play } from "lucide-react";
import { SheetomaticAiMark } from "@/components/saas/sheetomatic-ai-mark";

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
    <section className="ws-fms-launch-panel" aria-label="Next steps after approval">
      <header className="ws-fms-launch-head">
        <SheetomaticAiMark variant="icon" sizes="lg" />
        <div>
          <h3>{justApproved ? "Approved — finish setup" : "Live FMS — next steps"}</h3>
          <p className="ws-fms-muted">
            Workflow is live. {formNeedsSetup ? "Generate the intake form with AI, then" : "Review the form, then"}{" "}
            submit the first job to start the flow.
          </p>
        </div>
      </header>

      <ol className="ws-fms-launch-steps">
        <li className={`ws-fms-launch-step${formNeedsSetup ? " is-active" : " is-done"}`}>
          <span className="ws-fms-launch-step-num">1</span>
          <div className="ws-fms-launch-step-body">
            <strong>Create intake form</strong>
            <p className="ws-fms-muted">
              {formNeedsSetup
                ? `AI builds fields for "${formName}" from your workflow.`
                : "Form fields are ready — open to review or refine with AI."}
            </p>
            <Link href={formHref} className="btn-cta btn-primary ws-fms-launch-btn">
              <FileText size={16} aria-hidden />
              {formNeedsSetup ? "Create form with AI" : "Open intake form"}
              <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
        </li>

        <li className={`ws-fms-launch-step${formNeedsSetup ? "" : " is-active"}`}>
          <span className="ws-fms-launch-step-num">2</span>
          <div className="ws-fms-launch-step-body">
            <strong>Start flow</strong>
            <p className="ws-fms-muted">
              Submit the first request — it runs through every workflow step automatically.
            </p>
            <Link
              href={submitHref}
              className={`btn-cta ${formNeedsSetup ? "btn-secondary" : "btn-primary"} ws-fms-launch-btn`}
              aria-disabled={formNeedsSetup ? true : undefined}
            >
              <Play size={16} aria-hidden />
              Submit first job
              <ArrowRight size={14} aria-hidden />
            </Link>
            {formNeedsSetup ? (
              <p className="ws-fms-launch-hint ws-fms-muted">
                Complete step 1 first so submitters have fields to fill.
              </p>
            ) : null}
          </div>
        </li>
      </ol>
    </section>
  );
}
