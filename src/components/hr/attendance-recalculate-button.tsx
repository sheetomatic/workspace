"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { recalculateAttendanceAction } from "@/lib/hr/hr-actions";

export function AttendanceRecalculateButton({
  periodStart,
  periodEnd,
}: {
  periodStart: string;
  periodEnd: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <section className="ws-hr-panel">
      <h2>Recalculate attendance</h2>
      <p className="ws-hr-help">
        After you change Present, Absent, Holiday, or Leave, run this to reapply
        the holiday calendar and approved leave. Then open Payroll and tap
        Recalculate so salary matches.
      </p>
      {message ? <p className="ws-hr-note">{message}</p> : null}
      <button
        type="button"
        className="btn-cta btn-secondary"
        disabled={pending}
        onClick={() => {
          const formData = new FormData();
          formData.set("periodStart", periodStart);
          formData.set("periodEnd", periodEnd);
          startTransition(async () => {
            const result = await recalculateAttendanceAction(formData);
            setMessage(
              result.ok
                ? "Attendance recalculated. Open Payroll and tap Recalculate for salary."
                : result.message,
            );
            if (result.ok) {
              router.refresh();
            }
          });
        }}
      >
        {pending ? "Recalculating…" : "Recalculate this month"}
      </button>
    </section>
  );
}
