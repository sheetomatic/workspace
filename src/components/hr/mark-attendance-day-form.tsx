"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { markAttendanceDayAction } from "@/lib/hr/hr-actions";

export type MarkAttendanceEmployee = {
  userId: string;
  name: string;
};

export function MarkAttendanceDayForm({
  employees,
  defaultDate,
}: {
  employees: MarkAttendanceEmployee[];
  defaultDate: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  if (employees.length === 0) {
    return (
      <section className="ws-hr-panel">
        <h2>Mark attendance</h2>
        <p className="ws-hr-help">No active employees to mark.</p>
      </section>
    );
  }

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const result = await markAttendanceDayAction(formData);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage("Attendance saved.");
      router.refresh();
    });
  }

  return (
    <section className="ws-hr-panel">
      <h2>Mark attendance day</h2>
      <p className="ws-hr-help">
        Managers can set Present, Absent, or Half day for payroll-ready records.
      </p>
      <form action={onSubmit} className="ws-hr-form ws-hr-form-inline">
        <label>
          Employee
          <select name="userId" required defaultValue={employees[0]?.userId}>
            {employees.map((employee) => (
              <option key={employee.userId} value={employee.userId}>
                {employee.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input name="workDate" type="date" required defaultValue={defaultDate} />
        </label>
        <label>
          Status
          <select name="status" defaultValue="PRESENT">
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="HALF_DAY">Half day</option>
            <option value="ON_LEAVE">On leave</option>
            <option value="HOLIDAY">Holiday</option>
          </select>
        </label>
        <label>
          Notes
          <input name="notes" type="text" placeholder="Optional" />
        </label>
        <button type="submit" className="btn-cta btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save day"}
        </button>
      </form>
      {message ? (
        <p className={isError ? "ws-hr-feedback-error" : "ws-hr-feedback"} role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
