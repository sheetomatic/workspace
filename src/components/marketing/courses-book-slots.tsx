"use client";

import { useEffect, useState } from "react";
import { courseEnrollmentSchedule } from "@/lib/content/courses-enrollment";
import "./courses-enroll-pay.css";

type SlotDto = {
  id: string;
  sessionNumber: number;
  startsAt: string;
  endsAt: string;
  title: string;
  status: string;
};

type EnrollmentDto = {
  id: string;
  name: string;
  cohortLabel: string;
  status: string;
  slotsBooked: number;
  slots: SlotDto[];
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CoursesBookSlots({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentDto | null>(null);
  const [programStartYmd, setProgramStartYmd] = useState("");
  const [meetUrl, setMeetUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/courses/book-slots?token=${encodeURIComponent(token)}`,
        );
        const data = (await res.json()) as {
          enrollment?: EnrollmentDto;
          error?: string;
        };
        if (!res.ok || !data.enrollment) {
          if (!cancelled) {
            setError(data.error ?? "Booking link not found.");
          }
          return;
        }
        if (!cancelled) {
          setEnrollment(data.enrollment);
        }
      } catch {
        if (!cancelled) setError("Network error loading booking.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onBook() {
    if (!programStartYmd) {
      setError("Choose your first session date.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/courses/book-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          programStartYmd,
          meetUrl: meetUrl.trim() || null,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not book slots.");
        return;
      }
      setSuccess(data.message ?? "Slots booked.");
      const refresh = await fetch(
        `/api/courses/book-slots?token=${encodeURIComponent(token)}`,
      );
      const refreshed = (await refresh.json()) as { enrollment?: EnrollmentDto };
      if (refreshed.enrollment) setEnrollment(refreshed.enrollment);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="course-pay-lead">Loading your booking…</p>;
  }
  if (error && !enrollment) {
    return <p className="course-pay-error">{error}</p>;
  }
  if (!enrollment) {
    return <p className="course-pay-error">Booking not found.</p>;
  }

  const alreadyBooked = enrollment.slotsBooked > 0;

  return (
    <div className="course-pay-body" style={{ maxWidth: 520, margin: "0 auto" }}>
      <p className="course-pay-lead">
        Hi <strong>{enrollment.name}</strong> — cohort{" "}
        <strong>{enrollment.cohortLabel}</strong> ·{" "}
        {courseEnrollmentSchedule.sessionTimeLabel}. Status:{" "}
        <strong>{enrollment.status.replace("_", " ")}</strong>.
      </p>

      {alreadyBooked ? (
        <>
          <p className="course-pay-success">
            {enrollment.slotsBooked} sessions are booked. Email and WhatsApp
            alerts were sent when slots were confirmed.
          </p>
          <ul className="course-pay-meta" style={{ listStyle: "none", padding: 0 }}>
            {enrollment.slots.slice(0, 8).map((slot) => (
              <li key={slot.id}>
                #{slot.sessionNumber} · {formatWhen(slot.startsAt)}
              </li>
            ))}
          </ul>
          {enrollment.slots.length > 8 ? (
            <p className="course-pay-meta">
              Showing first 8 of {enrollment.slots.length} sessions.
            </p>
          ) : null}
        </>
      ) : (
        <>
          {enrollment.status !== "CONFIRMED" ? (
            <p className="course-pay-note">
              Payment is still pending confirmation. You can open this page again
              after Sheetomatic confirms payment to pick your first session date.
            </p>
          ) : (
            <>
              <label className="course-pay-field">
                First session date
                <input
                  type="date"
                  value={programStartYmd}
                  onChange={(event) => setProgramStartYmd(event.target.value)}
                  required
                />
              </label>
              <label className="course-pay-field">
                Meet / Zoom link (optional)
                <input
                  type="url"
                  value={meetUrl}
                  onChange={(event) => setMeetUrl(event.target.value)}
                  placeholder="https://meet.google.com/…"
                />
              </label>
              <p className="course-pay-note">
                We generate all {courseEnrollmentSchedule.totalClasses} live
                sessions on your cohort days from this start date. You and
                Sheetomatic get email + WhatsApp alerts with a Google Calendar
                link for session 1.
              </p>
              <button
                type="button"
                className="btn-primary btn-block"
                disabled={submitting || enrollment.status !== "CONFIRMED"}
                onClick={onBook}
              >
                {submitting ? "Booking…" : "Book my training slots"}
              </button>
            </>
          )}
        </>
      )}

      {error ? <p className="course-pay-error">{error}</p> : null}
      {success ? <p className="course-pay-success">{success}</p> : null}
    </div>
  );
}
