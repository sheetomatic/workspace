"use client";

import { useActionState } from "react";
import { CalendarCheck2, Loader2 } from "lucide-react";
import {
  confirmCourseEnrollmentAction,
  type CourseEnrollmentActionState,
} from "@/app/app/approvals/course-enrollment-actions";
import { courseCohortLabel } from "@/lib/content/courses-enrollment";
import { formatPendingAge } from "@/lib/workspace-format";

export type CourseEnrollmentRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  amountInr: number;
  cohort: "MON_FRI" | "TUE_SAT";
  status: "PAYMENT_PENDING" | "CONFIRMED" | "CANCELLED";
  createdAt: string;
};

const initialState: CourseEnrollmentActionState = { ok: false, message: "" };

export function CourseEnrollmentsPanel({
  enrollments,
}: {
  enrollments: CourseEnrollmentRow[];
}) {
  const [state, formAction, pending] = useActionState(
    confirmCourseEnrollmentAction,
    initialState,
  );

  const pendingRows = enrollments.filter((row) => row.status === "PAYMENT_PENDING");

  return (
    <section className="ws-sf-list-view" aria-label="Course enrollments">
      <header className="ws-sf-list-view-header">
        <div className="ws-sf-list-view-title">
          <CalendarCheck2 size={18} aria-hidden />
          <h2>Sheets / AppSheet / Looker enrollments</h2>
          <span className="ws-sf-list-view-count">{pendingRows.length}</span>
        </div>
        <p className="ws-em-section-lead">
          Buyer pays UPI/PhonePe on /courses for 1:1 Sheets · AppSheet · Looker coaching,
          then shares a screenshot on WhatsApp. Confirm after you verify payment — that
          books their Mon+Fri or Tue+Sat morning slots (8:30–10:00 AM IST).
        </p>
      </header>

      {state.message ? (
        <p className={state.ok ? "saas-form-message ok" : "saas-form-message error"}>
          {state.message}
        </p>
      ) : null}

      {pendingRows.length === 0 ? (
        <div className="ws-empty-state">
          <p>No course enrollments waiting for payment confirmation.</p>
        </div>
      ) : (
        <div className={`saas-list-card ${pending ? "is-updating" : ""}`}>
          {pendingRows.map((row) => (
            <article className="saas-list-row" key={row.id}>
              <div className="saas-list-icon" aria-hidden />
              <div className="saas-list-body">
                <h3>{row.name}</h3>
                <p>
                  {row.phone} · {row.email} · ₹{row.amountInr.toLocaleString("en-IN")} ·{" "}
                  {courseCohortLabel(row.cohort)} · submitted{" "}
                  {formatPendingAge(new Date(row.createdAt))}
                </p>
              </div>
              <form action={formAction} className="saas-list-actions">
                <input name="enrollmentId" type="hidden" value={row.id} />
                <button
                  className="btn-cta btn-primary ws-sf-btn-primary"
                  disabled={pending}
                  type="submit"
                >
                  {pending ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="animate-spin" size={14} aria-hidden />
                      Confirming…
                    </span>
                  ) : (
                    "Confirm payment · book slots"
                  )}
                </button>
              </form>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
