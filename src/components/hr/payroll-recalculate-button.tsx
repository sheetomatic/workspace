"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { recalculatePayrollRunAction } from "@/lib/hr/hr-actions";

export function PayrollRecalculateButton({
  runId,
}: {
  runId: string;
  periodStart?: string;
  periodEnd?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <span className="ws-hr-recalc">
      <button
        type="button"
        className="btn-secondary btn-sm"
        disabled={pending}
        onClick={() => {
          const confirmed = window.confirm(
            "Recalculate this run from current attendance? Holidays and approved leave are reapplied first. Present / half / short-leave punches stay.",
          );
          if (!confirmed) {
            return;
          }
          const formData = new FormData();
          formData.set("runId", runId);
          formData.set("refreshAttendance", "1");
          startTransition(async () => {
            const result = await recalculatePayrollRunAction(formData);
            if (!result.ok) {
              setMessage(result.message);
              return;
            }
            setMessage(null);
            router.refresh();
          });
        }}
      >
        {pending ? "Recalculating…" : "Recalculate"}
      </button>
      {message ? <span className="ws-hr-note">{message}</span> : null}
    </span>
  );
}
