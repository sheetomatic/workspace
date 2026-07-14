"use client";

import { useEffect, useState, useTransition } from "react";
import {
  bookLeadTrainingSlotsAction,
  getLeadTrainingSlotsAction,
} from "@/app/app/leads/actions";
import { courseCohorts } from "@/lib/content/courses-enrollment";

type SlotRow = {
  id: string;
  sessionNumber: number;
  startsAt: string;
  endsAt: string;
  title: string;
  status: string;
  meetUrl: string | null;
  whenLabel: string;
  googleCalendarUrl: string;
};

type EnrollmentRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  cohort: "MON_FRI" | "TUE_SAT";
  status: string;
  bookingToken: string | null;
  programStartDate: string | null;
  meetUrl: string | null;
  slots: SlotRow[];
};

export function LeadTrainingSlotsPanel({
  leadId,
  canManage,
}: {
  leadId: string;
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);

  function reload() {
    setLoading(true);
    startTransition(async () => {
      const result = await getLeadTrainingSlotsAction(leadId);
      setEnrollments(result.enrollments as EnrollmentRow[]);
      if (!result.ok && result.message) {
        setMessage(result.message);
        setIsError(true);
      }
      setLoading(false);
    });
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per lead
  }, [leadId]);

  function onBook(formData: FormData) {
    formData.set("leadId", leadId);
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const result = await bookLeadTrainingSlotsAction(formData);
      setMessage(result.message);
      setIsError(!result.ok);
      if (result.ok) {
        reload();
      }
    });
  }

  const hasSlots = enrollments.some((row) => row.slots.length > 0);

  return (
    <div className="leads-drawer-section">
      <h3>Training course slots</h3>
      <p className="leads-help">
        Schedule 24× 1:1 Sheets / AppSheet / Looker sessions (8:30–10:00 AM IST)
        like a meeting series. Client and you get email + WhatsApp alerts; add
        sessions to Google Calendar from the links below.
      </p>

      {canManage ? (
        <form action={onBook} className="leads-drawer-form">
          <label>
            Cohort
            <select name="cohort" defaultValue="MON_FRI" required>
              {courseCohorts.map((cohort) => (
                <option key={cohort.id} value={cohort.id}>
                  {cohort.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            First session date
            <input name="programStartYmd" type="date" required />
          </label>
          <label>
            Meet / Zoom link (optional)
            <input
              name="meetUrl"
              type="url"
              placeholder="https://meet.google.com/…"
            />
          </label>
          <button
            type="submit"
            className="btn-cta btn-primary"
            disabled={pending}
          >
            {pending ? "Booking…" : "Book training slots"}
          </button>
        </form>
      ) : null}

      {message ? (
        <p className={isError ? "saas-form-message error" : "saas-form-message ok"}>
          {message}
        </p>
      ) : null}

      {loading ? (
        <p className="leads-help">Loading booked slots…</p>
      ) : !hasSlots ? (
        <p className="leads-help">No training slots booked for this client yet.</p>
      ) : (
        enrollments.map((enrollment) =>
          enrollment.slots.length === 0 ? null : (
            <div key={enrollment.id} className="ws-hr-table-wrap" style={{ marginTop: 12 }}>
              <p className="leads-help">
                <strong>{enrollment.name}</strong> · {enrollment.cohort} ·{" "}
                {enrollment.status}
                {enrollment.bookingToken ? (
                  <>
                    {" "}
                    ·{" "}
                    <a
                      href={`/courses/book-slots?token=${enrollment.bookingToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Public booking link
                    </a>
                  </>
                ) : null}
              </p>
              <table className="ws-hr-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>When (IST)</th>
                    <th>Calendar</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollment.slots.slice(0, 12).map((slot) => (
                    <tr key={slot.id}>
                      <td>{slot.sessionNumber}</td>
                      <td>{slot.whenLabel}</td>
                      <td>
                        <a
                          href={slot.googleCalendarUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Google Calendar
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {enrollment.slots.length > 12 ? (
                <p className="leads-help">
                  Showing first 12 of {enrollment.slots.length} sessions.
                </p>
              ) : null}
            </div>
          ),
        )
      )}
    </div>
  );
}
