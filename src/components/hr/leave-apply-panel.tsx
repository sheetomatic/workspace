"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  reviewLeaveRequestAction,
  submitLeaveRequestAction,
} from "@/lib/hr/hr-actions";
import {
  leaveTypeLabel,
  leaveTypeShort,
} from "@/components/hr/leave-balance-cards";
import { HrFeedbackBanner } from "@/components/hr/hr-feedback";

export type LeaveRequestRow = {
  id: string;
  userId: string;
  leaveType: string;
  startDate: Date | string;
  endDate: Date | string;
  days: number;
  status: string;
  user: { name: string | null; email: string };
};

function statusClass(status: string) {
  if (status === "APPROVED") return "ws-leave-status is-approved";
  if (status === "REJECTED") return "ws-leave-status is-rejected";
  return "ws-leave-status is-pending";
}

function formatDate(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-IN");
}

export function LeaveApplyPanel({
  mode,
  requests,
  isManager,
  viewerUserId,
}: {
  mode: "apply" | "requests";
  requests: LeaveRequestRow[];
  isManager: boolean;
  viewerUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [formKey, setFormKey] = useState(0);

  function onApply(formData: FormData) {
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const result = await submitLeaveRequestAction(formData);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage("Leave request submitted.");
      setIsError(false);
      setFormKey((key) => key + 1);
      router.refresh();
    });
  }

  function onReview(formData: FormData) {
    const decision = String(formData.get("decision") ?? "");
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const result = await reviewLeaveRequestAction(formData);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage(
        decision === "APPROVED" ? "Leave approved." : "Leave rejected.",
      );
      setIsError(false);
      router.refresh();
    });
  }

  if (mode === "apply") {
    return (
      <div className="ws-hr-split">
        <section className="ws-hr-panel">
          <h2>Apply for leave</h2>
          <HrFeedbackBanner message={message} isError={isError} />
          <form key={formKey} action={onApply} className="ws-hr-form">
            <label>
              Type
              <select name="leaveType" defaultValue="CASUAL">
                <option value="CASUAL">Casual (CL)</option>
                <option value="SICK">Sick (SL)</option>
                <option value="EARNED">Earned (EL)</option>
                <option value="UNPAID">Unpaid</option>
                <option value="COMP_OFF">Comp off</option>
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
              <textarea name="reason" rows={3} />
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
    );
  }

  return (
    <section className="ws-hr-panel">
      <h2>{isManager ? "Team leave requests" : "My leave requests"}</h2>
      <HrFeedbackBanner message={message} isError={isError} />
      <div className="ws-hr-table-wrap">
        <table className="ws-hr-table">
          <thead>
            <tr>
              {isManager ? <th>Employee</th> : null}
              <th>Type</th>
              <th>Dates</th>
              <th>Days</th>
              <th>Status</th>
              {isManager ? <th>Action</th> : null}
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={isManager ? 6 : 4}>No leave requests yet.</td>
              </tr>
            ) : (
              requests.map((req) => (
                <tr key={req.id}>
                  {isManager ? (
                    <td>{req.user.name ?? req.user.email}</td>
                  ) : null}
                  <td>
                    <span className="ws-leave-type-pill">
                      {leaveTypeShort(req.leaveType)}
                    </span>{" "}
                    {leaveTypeLabel(req.leaveType)}
                  </td>
                  <td>
                    {formatDate(req.startDate)} to {formatDate(req.endDate)}
                  </td>
                  <td>{req.days}</td>
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
                        : "-"}
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
