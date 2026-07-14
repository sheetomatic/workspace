"use client";

import { useEffect, useState, useTransition } from "react";
import {
  bookLeadTrainingSlotsAction,
  getLeadTrainingSlotsAction,
} from "@/app/app/leads/actions";
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

function durationOptionLabel(minutes: number) {
  if (minutes === 60) return "1 hour";
  if (minutes === 90) return "1.5 hours";
  if (minutes === 120) return "2 hours";
  if (minutes === 180) return "3 hours";
  return `${minutes} min`;
}

function slotStatusLabel(status: string) {
  if (status === "SCHEDULED") return "Scheduled";
  if (status === "COMPLETED") return "Done";
  if (status === "CANCELLED") return "Cancelled";
  return status;
}

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

  const booked = enrollments.filter((row) => row.slots.length > 0);
  const hasSlots = booked.length > 0;
  const joinUrl =
    booked.find((row) => row.meetUrl)?.meetUrl ||
    booked
      .flatMap((row) => row.slots)
      .find((slot) => slot.meetUrl)?.meetUrl ||
    null;

  return (
    <div className="leads-training-panel">
      <header className="leads-training-head">
        <h3>Training</h3>
        <p>
          {hasSlots
            ? "Schedule and join link for this client."
            : `Set days, time (${TRAINING_BOOKING_WINDOW.label}), and Meet link — then generate sessions.`}
        </p>
      </header>

      {message ? (
        <p className={isError ? "saas-form-message error" : "saas-form-message ok"}>
          {message}
        </p>
      ) : null}

      {loading ? (
        <p className="leads-help">Loading…</p>
      ) : hasSlots ? (
        booked.map((enrollment) => (
          <section key={enrollment.id} className="leads-training-schedule">
            <div className="leads-training-schedule-head">
              <div>
                <strong>{enrollment.name}</strong>
                <span>
                  {enrollment.daysLabel || enrollment.cohort}
                  {enrollment.status === "CONFIRMED" ? " · Active" : ` · ${enrollment.status}`}
                  {" · "}
                  {enrollment.slots.length} sessions
                </span>
              </div>
              <div className="leads-training-schedule-actions">
                {joinUrl ? (
                  <a
                    className="btn-primary btn-sm"
                    href={joinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Link to join
                  </a>
                ) : null}
                {enrollment.bookingToken ? (
                  <a
                    className="btn-secondary btn-sm"
                    href={`/courses/book-slots?token=${enrollment.bookingToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Client page
                  </a>
                ) : null}
              </div>
            </div>

            <div className="leads-training-table-wrap">
              <table className="leads-training-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>When (IST)</th>
                    <th>Status</th>
                    <th>Join</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollment.slots.map((slot) => {
                    const slotJoin = slot.meetUrl || enrollment.meetUrl;
                    return (
                      <tr key={slot.id}>
                        <td>{slot.sessionNumber}</td>
                        <td>{slot.whenLabel}</td>
                        <td>{slotStatusLabel(slot.status)}</td>
                        <td>
                          {slotJoin ? (
                            <a
                              href={slotJoin}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Join
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))
      ) : canManage ? (
        <form action={onBook} className="leads-training-form">
          <div className="leads-training-form-section">
            <h4>Schedule</h4>
            <div className="leads-training-fields">
              <label>
                Day
                <select name="dayOne" defaultValue="0" required>
                  {TRAINING_WEEKDAYS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Second day
                <select name="dayTwo" defaultValue="none">
                  <option value="none">None (single day)</option>
                  {TRAINING_WEEKDAYS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Frequency
                <select name="frequency" defaultValue="WEEKLY" required>
                  <option value="WEEKLY">Weekly</option>
                  <option value="BIWEEKLY">Every other week</option>
                </select>
              </label>
              <label>
                Start date
                <input name="programStartYmd" type="date" required />
              </label>
            </div>
          </div>

          <div className="leads-training-form-section">
            <h4>Session</h4>
            <div className="leads-training-fields">
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
              </label>
              <label>
                Length
                <select name="sessionDurationMin" defaultValue="90">
                  {TRAINING_SESSION_DURATION_OPTIONS.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {durationOptionLabel(minutes)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Total sessions
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
            </div>
          </div>

          <div className="leads-training-form-section">
            <h4>Join link</h4>
            <label className="leads-training-meet">
              Google Meet
              <input
                name="meetUrl"
                type="url"
                placeholder="https://meet.google.com/…"
              />
            </label>
          </div>

          <div className="leads-training-form-footer">
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Generating…" : "Generate sessions"}
            </button>
          </div>
        </form>
      ) : (
        <p className="leads-help">No training sessions booked for this client yet.</p>
      )}
    </div>
  );
}
