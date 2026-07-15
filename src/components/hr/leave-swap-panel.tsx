"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  reviewSwapRequestAction,
  submitSwapRequestAction,
} from "@/lib/hr/hr-actions";
import { HrFeedbackBanner } from "@/components/hr/hr-feedback";

function statusClass(status: string) {
  if (status === "APPROVED") return "ws-leave-status is-approved";
  if (status === "REJECTED") return "ws-leave-status is-rejected";
  return "ws-leave-status is-pending";
}

function typeLabel(type: string) {
  if (type === "LEAVE_SWAP") return "Leave swap";
  if (type === "OFF_DAY_SWAP") return "Off-day swap";
  return type;
}

export type LeaveSwapRequestRow = {
  id: string;
  userId: string;
  swapType: string;
  fromDate: Date | string;
  toDate: Date | string;
  reason: string | null;
  status: string;
  user: { name: string | null; email: string };
};

function formatDate(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-IN");
}

export function LeaveSwapPanel({
  requests,
  isManager,
  viewerUserId,
}: {
  requests: LeaveSwapRequestRow[];
  isManager: boolean;
  viewerUserId: string;
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
      const result = await submitSwapRequestAction(formData);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage("Swap request submitted.");
      setIsError(false);
      setFormKey((key) => key + 1);
      router.refresh();
    });
  }

  function onReview(formData: FormData) {
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const result = await reviewSwapRequestAction(formData);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage("Swap request updated.");
      setIsError(false);
      router.refresh();
    });
  }

  return (
    <>
      <HrFeedbackBanner message={message} isError={isError} />
      <div className="ws-hr-split">
        <section className="ws-hr-panel">
          <h2>Swap leave / off day</h2>
          <p className="ws-hr-help">
            Request to swap a leave day or weekly off with another working day.
            Manager approval required.
          </p>
          <form key={formKey} action={onSubmit} className="ws-hr-form">
            <label>
              Type
              <select name="swapType" defaultValue="LEAVE_SWAP" required>
                <option value="LEAVE_SWAP">Leave swap</option>
                <option value="OFF_DAY_SWAP">Off-day swap</option>
              </select>
            </label>
            <label>
              Original day
              <input name="fromDate" type="date" required />
            </label>
            <label>
              Swap with (working day)
              <input name="toDate" type="date" required />
            </label>
            <label>
              Reason
              <textarea
                name="reason"
                rows={3}
                placeholder="Why you need to swap these days"
              />
            </label>
            <button
              type="submit"
              className="btn-cta btn-primary"
              disabled={pending}
            >
              {pending ? "Submitting…" : "Submit swap request"}
            </button>
          </form>
        </section>
      </div>

      <section className="ws-hr-panel">
        <h2>{isManager ? "Team swap requests" : "My swap requests"}</h2>
        <div className="ws-hr-table-wrap">
          <table className="ws-hr-table">
            <thead>
              <tr>
                {isManager ? <th>Employee</th> : null}
                <th>Type</th>
                <th>Original → Swap</th>
                <th>Reason</th>
                <th>Status</th>
                {isManager ? <th>Action</th> : null}
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 6 : 4}>No swap requests yet.</td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id}>
                    {isManager ? (
                      <td>{req.user.name ?? req.user.email}</td>
                    ) : null}
                    <td>
                      <span className="ws-leave-type-pill">
                        {typeLabel(req.swapType)}
                      </span>
                    </td>
                    <td>
                      {formatDate(req.fromDate)} → {formatDate(req.toDate)}
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
    </>
  );
}
