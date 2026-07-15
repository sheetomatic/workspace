"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  addCandidateAction,
  createJobOpeningAction,
} from "@/lib/hr/hr-actions";
import { HrFeedbackBanner } from "@/components/hr/hr-feedback";

export type HiringOpeningOption = {
  id: string;
  title: string;
  isOpen: boolean;
};

export function HiringAdminPanel({
  openings,
}: {
  openings: HiringOpeningOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [openingFormKey, setOpeningFormKey] = useState(0);
  const [candidateFormKey, setCandidateFormKey] = useState(0);

  function onPublish(formData: FormData) {
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const result = await createJobOpeningAction(formData);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage("Job opening published.");
      setIsError(false);
      setOpeningFormKey((key) => key + 1);
      router.refresh();
    });
  }

  function onAddCandidate(formData: FormData) {
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const result = await addCandidateAction(formData);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage("Candidate added to pipeline.");
      setIsError(false);
      setCandidateFormKey((key) => key + 1);
      router.refresh();
    });
  }

  const openRoles = openings.filter((o) => o.isOpen);

  return (
    <>
      <HrFeedbackBanner message={message} isError={isError} />
      <div className="ws-hr-split">
      <section className="ws-hr-panel">
        <h2>New job opening</h2>
        <form
          key={`opening-${openingFormKey}`}
          action={onPublish}
          className="ws-hr-form"
        >
          <label>
            Title
            <input name="title" type="text" required />
          </label>
          <label>
            Location
            <input name="location" type="text" />
          </label>
          <label>
            Description
            <textarea name="description" rows={4} />
          </label>
          <button
            type="submit"
            className="btn-cta btn-primary"
            disabled={pending}
          >
            {pending ? "Publishing…" : "Publish opening"}
          </button>
        </form>
      </section>

      <section className="ws-hr-panel">
        <h2>Add candidate</h2>
        <form
          key={`candidate-${candidateFormKey}`}
          action={onAddCandidate}
          className="ws-hr-form"
        >
          <label>
            Full name
            <input name="fullName" type="text" required />
          </label>
          <label>
            Email
            <input name="email" type="email" />
          </label>
          <label>
            Phone
            <input name="phone" type="tel" />
          </label>
          <label>
            Job opening
            <select name="jobOpeningId" defaultValue="">
              <option value="">General application</option>
              {openRoles.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="btn-cta btn-primary"
            disabled={pending}
          >
            {pending ? "Adding…" : "Add to pipeline"}
          </button>
        </form>
      </section>
      </div>
    </>
  );
}
