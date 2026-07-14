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

/** Enrollment status under the Google Calendar embed (optional token). */
export function CoursesBookSlots({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentDto | null>(null);

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

  if (loading) {
    return <p className="course-pay-lead">Loading your enrollment…</p>;
  }
  if (error && !enrollment) {
    return <p className="course-pay-error">{error}</p>;
  }
  if (!enrollment) {
    return <p className="course-pay-error">Enrollment not found.</p>;
  }

  return (
    <div className="course-pay-body course-book-enrollment">
      <p className="course-pay-lead">
        Hi <strong>{enrollment.name}</strong> — cohort{" "}
        <strong>{enrollment.cohortLabel}</strong> ·{" "}
        {courseEnrollmentSchedule.sessionTimeLabel}. Status:{" "}
        <strong>{enrollment.status.replaceAll("_", " ")}</strong>.
      </p>

      {enrollment.status !== "CONFIRMED" ? (
        <p className="course-pay-note">
          Payment is still pending confirmation. You can still pick a slot on
          Google Calendar above; Sheetomatic will match it after payment is
          verified.
        </p>
      ) : (
        <p className="course-pay-success">
          Payment confirmed. Use the Google Calendar above to book or change
          your training slot.
        </p>
      )}

      {enrollment.slotsBooked > 0 ? (
        <>
          <p className="course-pay-meta">
            {enrollment.slotsBooked} sessions on file:
          </p>
          <ul className="course-book-slot-list">
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
      ) : null}
    </div>
  );
}
