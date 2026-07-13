"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { verifyAttendanceAction } from "@/lib/hr/hr-actions";

export type PendingVerifyRow = {
  id: string;
  employeeName: string;
  workDate: string;
  checkInAt: string | null;
  isLate: boolean;
  otHours: number;
  siteName: string | null;
  status: string;
};

export function AttendanceVerifyQueue({
  rows,
}: {
  rows: PendingVerifyRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  if (rows.length === 0) {
    return (
      <section className="ws-hr-panel">
        <h2>Verify team Present</h2>
        <p className="ws-hr-help">No pending self check-ins to approve.</p>
      </section>
    );
  }

  function run(formData: FormData) {
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const result = await verifyAttendanceAction(formData);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage("Attendance verification updated.");
      router.refresh();
    });
  }

  return (
    <section className="ws-hr-panel">
      <h2>Verify team Present</h2>
      <p className="ws-hr-help">
        Self punches stay pending until a manager approves. Rejected days count as
        absent for payroll.
      </p>
      <div className="ws-hr-table-wrap">
        <table className="ws-hr-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Date</th>
              <th>Check-in</th>
              <th>Site</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  {row.employeeName}
                  {row.isLate ? (
                    <span className="ws-hr-optional-badge" title="Late vs work start">
                      {" "}
                      Late
                    </span>
                  ) : null}
                </td>
                <td>{row.workDate}</td>
                <td>
                  {row.checkInAt
                    ? new Date(row.checkInAt).toLocaleTimeString("en-IN", {
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "—"}
                </td>
                <td>{row.siteName ?? "—"}</td>
                <td>
                  <form action={run} className="ws-hr-form-inline ws-att-verify-actions">
                    <input type="hidden" name="recordId" value={row.id} />
                    <label className="ws-att-verify-ot">
                      OT
                      <input
                        name="otHours"
                        type="number"
                        min={0}
                        step={0.25}
                        defaultValue={row.otHours || ""}
                        placeholder="0"
                        aria-label="OT hours"
                      />
                    </label>
                    <button
                      type="submit"
                      name="decision"
                      value="approve"
                      className="btn-cta btn-primary btn-compact"
                      disabled={pending}
                    >
                      Approve
                    </button>
                    <button
                      type="submit"
                      name="decision"
                      value="reject"
                      className="btn-cta btn-secondary btn-compact"
                      disabled={pending}
                    >
                      Reject
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {message ? (
        <p className={isError ? "ws-hr-feedback-error" : "ws-hr-feedback"} role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
