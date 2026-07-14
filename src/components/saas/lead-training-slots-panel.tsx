"use client";

import { useEffect, useState, useTransition } from "react";
import {
  bookLeadTrainingSlotsAction,
  getLeadTrainingSlotsAction,
} from "@/app/app/leads/actions";
import { GoogleCalendarBookingEmbed } from "@/components/marketing/google-calendar-booking-embed";
import { COURSE_GOOGLE_CALENDAR_BOOKING_URL } from "@/lib/content/courses-enrollment";
import {
  TRAINING_BOOKING_WINDOW,
  TRAINING_SESSION_DURATION_OPTIONS,
  TRAINING_WEEKDAYS,
} from "@/lib/courses/weekdays";

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
  cohort: "MON_FRI" | "TUE_SAT" | "CUSTOM";
  weekdaysCsv?: string | null;
  daysLabel?: string;
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
  const [showEmbed, setShowEmbed] = useState(false);

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
    <div className="leads-training-panel">
      <div className="leads-training-hero">
        <div>
          <h3>Training slots</h3>
          <p className="leads-help">
            Book a live 1:1 session on Google Calendar, or generate the full
            cohort schedule for this client.
          </p>
        </div>
        <a
          className="btn-cta btn-primary btn-compact"
          href={COURSE_GOOGLE_CALENDAR_BOOKING_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Google Calendar
        </a>
      </div>

      <div className="leads-training-actions">
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={() => setShowEmbed((current) => !current)}
        >
          {showEmbed ? "Hide calendar embed" : "Show calendar embed"}
        </button>
        <a
          className="leads-training-link"
          href={COURSE_GOOGLE_CALENDAR_BOOKING_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          calendar.app.google/kbDEB6xuqRYEdUue9
        </a>
      </div>

      {showEmbed ? (
        <GoogleCalendarBookingEmbed
          compact
          activateOnClick
          title="Book a slot"
          className="leads-training-embed"
        />
      ) : null}

      {canManage ? (
        <form action={onBook} className="leads-drawer-form leads-training-form">
          <h4 className="leads-training-form-title">Generate training calendar</h4>
          <p className="leads-help">
            Pick one day or a two-day combo (Sunday included). Start time can be any
            slot in {TRAINING_BOOKING_WINDOW.label}. Single-day 3-hour sessions are
            supported.
          </p>
          <div className="leads-drawer-grid">
            <label>
              Day 1
              <select name="dayOne" defaultValue="0" required>
                {TRAINING_WEEKDAYS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
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
            <label>
              Time (IST)
              <input
                name="sessionTimeIst"
                type="time"
                min={TRAINING_BOOKING_WINDOW.startIst}
                max={TRAINING_BOOKING_WINDOW.endIst}
                defaultValue="08:30"
                required
              />
              <span className="leads-help">{TRAINING_BOOKING_WINDOW.label}</span>
            </label>
            <label>
              Frequency
              <select name="frequency" defaultValue="WEEKLY" required>
                <option value="WEEKLY">Weekly</option>
                <option value="BIWEEKLY">Every other week</option>
              </select>
            </label>
            <label>
              Start date / day
              <input name="programStartYmd" type="date" required />
            </label>
            <label>
              Total sessions needed
              <input
                name="totalSessions"
                type="number"
                min={1}
                max={48}
                step={1}
                defaultValue={24}
                required
              />
            </label>
            <label>
              Session length
              <select name="sessionDurationMin" defaultValue="90">
                {TRAINING_SESSION_DURATION_OPTIONS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes === 180
                      ? "3 hours (180 min)"
                      : minutes === 60
                        ? "1 hour (60 min)"
                        : minutes === 90
                          ? "1.5 hours (90 min)"
                          : minutes === 120
                            ? "2 hours (120 min)"
                            : `${minutes} min`}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Standard Google Meet link
            <input
              name="meetUrl"
              type="url"
              placeholder="https://meet.google.com/xxx-xxxx-xxx"
            />
            <span className="leads-help">
              Paste your standing Meet link — applied to every session. Leave blank if you will add later.
            </span>
          </label>
          <button
            type="submit"
            className="btn-cta btn-secondary"
            disabled={pending}
          >
            {pending ? "Booking…" : "Generate sessions"}
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
        <p className="leads-help">
          No cohort slots on file yet for this client.
        </p>
      ) : (
        enrollments.map((enrollment) =>
          enrollment.slots.length === 0 ? null : (
            <div key={enrollment.id} className="leads-training-table-wrap">
              <p className="leads-help">
                <strong>{enrollment.name}</strong> ·{" "}
                {enrollment.daysLabel || enrollment.cohort} · {enrollment.status}
                {enrollment.bookingToken ? (
                  <>
                    {" "}
                    ·{" "}
                    <a
                      href={`/courses/book-slots?token=${enrollment.bookingToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Client page
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
                          Add
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
