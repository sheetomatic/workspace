"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { completeOnboardingAction } from "@/lib/hr/hr-actions";
import { HrFeedbackBanner } from "@/components/hr/hr-feedback";

export type OnboardingChecklistRow = {
  docType: string;
  label: string;
  uploaded: boolean;
  documentId: string | null;
};

export function OnboardingChecklist({
  employeeProfileId,
  onboardingStatus,
  educationSummary,
  experienceSummary,
  items,
  allRequiredUploaded,
  canComplete,
  canSkip,
}: {
  employeeProfileId: string;
  onboardingStatus: string;
  educationSummary: string | null;
  experienceSummary: string | null;
  items: OnboardingChecklistRow[];
  allRequiredUploaded: boolean;
  canComplete: boolean;
  canSkip: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const done =
    onboardingStatus === "COMPLETE" || onboardingStatus === "SKIPPED";
  const uploadedCount = items.filter((item) => item.uploaded).length;

  function onComplete(formData: FormData) {
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const result = await completeOnboardingAction(formData);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage(
        formData.get("skipIncomplete") === "true"
          ? "Onboarding marked skipped."
          : "Onboarding completed.",
      );
      router.refresh();
    });
  }

  return (
    <section className="ws-hr-form-section" aria-label="Onboarding documents">
      <div className="ws-ims-panel-head">
        <h3>Onboarding checklist</h3>
        <span
          className={
            done
              ? "ws-leave-status is-approved"
              : "ws-leave-status is-pending"
          }
        >
          {onboardingStatus === "COMPLETE"
            ? "Complete"
            : onboardingStatus === "SKIPPED"
              ? "Skipped"
              : "Pending docs"}
        </span>
      </div>
      <HrFeedbackBanner message={message} isError={isError} />
      <p className="ws-hr-help">
        Required: Education, CV, Work Experience, NOC/Resignation, Aadhaar, and
        PAN. {uploadedCount} of {items.length} uploaded.
      </p>

      <ul className="ws-hr-onboard-list">
        {items.map((item) => (
          <li key={item.docType} className="ws-hr-onboard-item">
            <span
              className={
                item.uploaded
                  ? "ws-hr-onboard-mark is-done"
                  : "ws-hr-onboard-mark"
              }
              aria-hidden
            >
              {item.uploaded ? "✓" : "○"}
            </span>
            <div>
              <strong>{item.label}</strong>
              <div className="ws-apple-cell-secondary">
                {item.uploaded ? "Uploaded" : "Required"}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {canComplete && !done ? (
        <form action={onComplete} className="ws-hr-form">
          <input
            type="hidden"
            name="employeeProfileId"
            value={employeeProfileId}
          />
          <label>
            Education summary
            <textarea
              name="educationSummary"
              rows={2}
              defaultValue={educationSummary ?? ""}
              placeholder="Degrees, institutions, year"
            />
          </label>
          <label>
            Work experience summary
            <textarea
              name="experienceSummary"
              rows={2}
              defaultValue={experienceSummary ?? ""}
              placeholder="Prior roles and years"
            />
          </label>
          <div className="ws-hr-form-actions">
            <button
              type="submit"
              className="btn-cta btn-primary"
              disabled={pending || !allRequiredUploaded}
            >
              {pending ? "Saving…" : "Mark onboarding complete"}
            </button>
            {canSkip ? (
              <button
                type="submit"
                name="skipIncomplete"
                value="true"
                className="btn-cta btn-secondary"
                disabled={pending}
              >
                Skip incomplete (admin)
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      {done && (educationSummary || experienceSummary) ? (
        <div className="ws-hr-note">
          {educationSummary ? <p>Education: {educationSummary}</p> : null}
          {experienceSummary ? <p>Experience: {experienceSummary}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
