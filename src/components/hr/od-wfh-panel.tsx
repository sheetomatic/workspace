"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  reviewAttendanceExceptionAction,
  submitAttendanceExceptionAction,
} from "@/lib/hr/hr-actions";

function statusClass(status: string) {
  if (status === "APPROVED") return "ws-leave-status is-approved";
  if (status === "REJECTED") return "ws-leave-status is-rejected";
  return "ws-leave-status is-pending";
}

export type OdWfhRequestRow = {
  id: string;
  userId: string;
  exceptionType: string;
  startDate: Date | string;
  endDate: Date | string;
  reason: string | null;
  status: string;
  user: { name: string | null; email: string };
};

function formatDate(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-IN");
}

export function OdWfhPanel({
  requests,
  isManager,
  viewerUserId,
}: {
  requests: OdWfhRequestRow[];
  isManager: boolean;
  viewerUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const result = await submitAttendanceExceptionAction(formData);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage("OD/WFH request submitted.");
      router.refresh();
    });
  }

  function onReview(formData: FormData) {
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const result = await reviewAttendanceExceptionAction(formData);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage("Request updated.");
      router.refresh();
    });
  }

  return (
    <>
      <div className="ws-hr-split">
        <section className="ws-hr-panel">
          <h2>Request OD / WFH</h2>
          <p className="ws-hr-help">
            Approved OD or work-from-home marks those weekdays as present for
            attendance and payroll.
          </p>
          <form action={onSubmit} className="ws-hr-form">
            <label>
              Type
              <select name="exceptionType" defaultValue="OD" required>
                <option value="OD">On duty (OD)</option>
                <option value="WFH">Work from home (WFH)</option>
              </select>
            </label>
            <label>
              From
              <input name="startDate" type="date" required />
            </label>
            <label>
              To
              <input name="endDate" type="date" required />
            </label>
            <label>
              Reason
              <textarea name="reason" rows={3} placeholder="Client visit, travel, etc." />
            </label>
            <button
              type="submit"
              className="btn-cta btn-primary"
              disabled={pending}
            >
              {pending ? "Submitting…" : "Submit request"}
            </button>
          </form>
        </section>
      </div>

      <section className="ws-hr-panel">
        <h2>{isManager ? "Team OD / WFH requests" : "My OD / WFH requests"}</h2>
        <div className="ws-hr-table-wrap">
          <table className="ws-hr-table">
            <thead>
              <tr>
                {isManager ? <th>Employee</th> : null}
                <th>Type</th>
                <th>Dates</th>
                <th>Reason</th>
                <th>Status</th>
                {isManager ? <th>Action</th> : null}
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 6 : 4}>No OD/WFH requests yet.</td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id}>
                    {isManager ? (
                      <td>{req.user.name ?? req.user.email}</td>
                    ) : null}
                    <td>
                      <span className="ws-leave-type-pill">{req.exceptionType}</span>
                    </td>
                    <td>
                      {formatDate(req.startDate)} to {formatDate(req.endDate)}
                    </td>
                    <td>{req.reason ?? "—"}</td>
                    <td>
                      <span className={statusClass(req.status)}>{req.status}</span>
                    </td>
                    {isManager &&
                    req.status === "PENDING" &&
                    req.userId !== viewerUserId ? (
                      <td className="ws-hr-actions">
                        <form action={onReview}>
                          <input type="hidden" name="id" value={req.id} />
                          <button
                            name="decision"
                            value="APPROVED"
                            className="btn-cta btn-primary btn-compact"
                            disabled={pending}
                          >
                            Approve
                          </button>
                          <button
                            name="decision"
                            value="REJECTED"
                            className="btn-cta btn-secondary btn-compact"
                            disabled={pending}
                          >
                            Reject
                          </button>
                        </form>
                      </td>
                    ) : isManager ? (
                      <td>
                        {req.userId === viewerUserId && req.status === "PENDING"
                          ? "Awaiting another approver"
                          : "—"}
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {message ? (
        <p
          className={isError ? "ws-hr-feedback-error" : "ws-hr-feedback"}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </>
  );
}
