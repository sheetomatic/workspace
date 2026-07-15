"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createPayrollRunAction } from "@/lib/hr/hr-actions";
import { HrFeedbackBanner } from "@/components/hr/hr-feedback";

export function PayrollGenerateForm({
  defaultStart,
  defaultEnd,
}: {
  defaultStart: string;
  defaultEnd: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const result = await createPayrollRunAction(formData);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage("Payroll calculated.");
      router.refresh();
    });
  }

  return (
    <section className="ws-hr-panel">
      <h2>Generate payroll from attendance</h2>
      <HrFeedbackBanner message={message} isError={isError} />
      <form action={onSubmit} className="ws-hr-form ws-hr-form-inline">
        <label>
          Period start
          <input name="periodStart" type="date" defaultValue={defaultStart} required />
        </label>
        <label>
          Period end
          <input name="periodEnd" type="date" defaultValue={defaultEnd} required />
        </label>
        <button type="submit" className="btn-cta btn-primary" disabled={pending}>
          {pending ? "Calculating…" : "Calculate salary"}
        </button>
      </form>
    </section>
  );
}
