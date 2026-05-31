"use client";

import { useState, useTransition } from "react";
import { reviewApproval } from "@/app/app/approvals/actions";
import { formatPendingAge } from "@/lib/workspace-format";

export type ApprovalRow = {
  id: string;
  title: string;
  department: string;
  pendingSince: Date;
};

export function ApprovalsList({ items }: { items: ApprovalRow[] }) {
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function submitReview(
    approvalId: string,
    decision: "APPROVED" | "REJECTED",
  ) {
    startTransition(async () => {
      const result = await reviewApproval(approvalId, decision, note);
      setMessage(result.message);
      if (result.ok) {
        setActiveId(null);
        setNote("");
      }
    });
  }

  return (
    <div className={`saas-list-card ${pending ? "is-updating" : ""}`}>
      {message ? <p className="saas-form-message ok">{message}</p> : null}
      {items.map((item) => (
        <article className="saas-list-row" key={item.id}>
          <div className="saas-list-icon" aria-hidden />
          <div className="saas-list-body">
            <h3>{item.title}</h3>
            <p>
              {item.department} | pending {formatPendingAge(item.pendingSince)}
            </p>
            {activeId === item.id ? (
              <label className="saas-inline-field">
                Note (optional)
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Reason or MIS instruction"
                  type="text"
                />
              </label>
            ) : null}
          </div>
          {activeId === item.id ? (
            <div className="saas-list-actions">
              <button
                className="btn-cta btn-primary"
                disabled={pending}
                type="button"
                onClick={() => submitReview(item.id, "APPROVED")}
              >
                Approve
              </button>
              <button
                className="btn-cta btn-secondary"
                disabled={pending}
                type="button"
                onClick={() => submitReview(item.id, "REJECTED")}
              >
                Reject
              </button>
              <button
                className="btn-cta btn-ghost"
                type="button"
                onClick={() => {
                  setActiveId(null);
                  setNote("");
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="btn-cta btn-secondary"
              type="button"
              onClick={() => setActiveId(item.id)}
            >
              Review
            </button>
          )}
        </article>
      ))}
    </div>
  );
}
