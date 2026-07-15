"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createFieldVisitAction } from "@/lib/hr/hr-actions";
import { HrFeedbackBanner } from "@/components/hr/hr-feedback";

export type PlanFieldVisitMember = {
  id: string;
  name: string;
};

export function PlanFieldVisitForm({
  members,
}: {
  members: PlanFieldVisitMember[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [formKey, setFormKey] = useState(0);

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const result = await createFieldVisitAction(formData);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage("Visit planned.");
      setIsError(false);
      setFormKey((key) => key + 1);
      router.refresh();
    });
  }

  return (
    <>
      <HrFeedbackBanner message={message} isError={isError} />
      <form key={formKey} action={onSubmit} className="ws-hr-form">
        <label>
          Assign to
          <select name="assigneeUserId" required defaultValue="">
            <option value="" disabled>
              Select team member
            </option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Client name
          <input name="clientName" type="text" required />
        </label>
        <label>
          Location label
          <input name="locationLabel" type="text" placeholder="Area / city" />
        </label>
        <label>
          Planned date/time
          <input name="plannedAt" type="datetime-local" />
        </label>
        <label>
          Reference latitude (optional)
          <input
            name="geoLat"
            type="number"
            step="any"
            placeholder="e.g. 19.0760"
          />
        </label>
        <label>
          Reference longitude (optional)
          <input
            name="geoLng"
            type="number"
            step="any"
            placeholder="e.g. 72.8777"
          />
        </label>
        <p className="ws-hr-help">
          Reference GPS is optional and used for review/maps only. Field teams
          can check in while travelling, at client shops, or on sites without a
          radius lock.
        </p>
        <label>
          Purpose
          <textarea
            name="purpose"
            rows={3}
            placeholder="Retail order, site inspection, BD sourcing, distribution, collection"
          />
        </label>
        <button
          type="submit"
          className="btn-cta btn-primary"
          disabled={pending}
        >
          {pending ? "Planning…" : "Plan visit"}
        </button>
      </form>
    </>
  );
}
