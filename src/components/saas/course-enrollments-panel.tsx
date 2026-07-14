"use client";

import { useActionState } from "react";
import { CalendarCheck2, Loader2 } from "lucide-react";
import {
  confirmCourseEnrollmentAction,
  type CourseEnrollmentActionState,
} from "@/app/app/approvals/course-enrollment-actions";
import {
  COURSE_GOOGLE_CALENDAR_BOOKING_URL,
  courseCohortLabel,
} from "@/lib/content/courses-enrollment";
import {
  TRAINING_BOOKING_WINDOW,
  TRAINING_SESSION_DURATION_OPTIONS,
  TRAINING_WEEKDAYS,
} from "@/lib/courses/weekdays";
import { formatPendingAge } from "@/lib/workspace-format";

export type CourseEnrollmentRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  amountInr: number;
  cohort: "MON_FRI" | "TUE_SAT" | "CUSTOM";
  status: "PAYMENT_PENDING" | "CONFIRMED" | "CANCELLED";
  createdAt: string;
  bookingToken?: string | null;
  slotsBooked?: number;
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
          Confirm UPI payment, optionally set the first session date to generate
          all 24 training slots, and alert the client + you on email/WhatsApp.
          Clients book live slots on{" "}
          <a
            href={COURSE_GOOGLE_CALENDAR_BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Calendar
          </a>{" "}
          or <code>/courses/book-slots</code>.
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
              <form action={formAction} className="saas-list-actions" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
                <input name="enrollmentId" type="hidden" value={row.id} />
                <label style={{ fontSize: 12 }}>
                  Day 1
                  <select name="dayOne" defaultValue="0">
                    {TRAINING_WEEKDAYS.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ fontSize: 12 }}>
                  Day 2
                  <select name="dayTwo" defaultValue="none">
                    <option value="none">Single day only</option>
                    {TRAINING_WEEKDAYS.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ fontSize: 12 }}>
                  Start date / day (optional)
                  <input name="programStartYmd" type="date" />
                </label>
                <label style={{ fontSize: 12 }}>
                  Time IST ({TRAINING_BOOKING_WINDOW.label})
                  <input
                    name="sessionTimeIst"
                    type="time"
                    min={TRAINING_BOOKING_WINDOW.startIst}
                    max={TRAINING_BOOKING_WINDOW.endIst}
                    defaultValue="08:30"
                  />
                </label>
                <label style={{ fontSize: 12 }}>
                  Frequency
                  <select name="frequency" defaultValue="WEEKLY">
                    <option value="WEEKLY">Weekly</option>
                    <option value="BIWEEKLY">Every other week</option>
                  </select>
                </label>
                <label style={{ fontSize: 12 }}>
                  Session length
                  <select name="sessionDurationMin" defaultValue="90">
                    {TRAINING_SESSION_DURATION_OPTIONS.map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes === 180 ? "3 hours (180 min)" : `${minutes} min`}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ fontSize: 12 }}>
                  Total sessions needed
                  <input name="totalSessions" type="number" min={1} max={48} defaultValue={24} />
                </label>
                <label style={{ fontSize: 12 }}>
                  Standard Google Meet link
                  <input name="meetUrl" type="url" placeholder="https://meet.google.com/…" />
                </label>
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
                {row.bookingToken ? (
                  <a
                    href={`/courses/book-slots?token=${row.bookingToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12 }}
                  >
                    Open client booking link
                  </a>
                ) : null}
              </form>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
