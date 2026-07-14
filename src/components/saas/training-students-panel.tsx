"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, ExternalLink, Video } from "lucide-react";

export type TrainingStudentSlotView = {
  id: string;
  sessionNumber: number;
  startsAt: string;
  endsAt: string;
  title: string;
  status: string;
  meetUrl: string | null;
  whenLabel: string;
  joinUrl: string | null;
};

export type TrainingStudentView = {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  daysLabel: string;
  frequency: string;
  sessionTimeIst: string;
  sessionDurationMin: number;
  totalSessions: number;
  joinUrl: string | null;
  inboundLeadId: string | null;
  bookingToken: string | null;
  upcomingCount: number;
  completedCount: number;
  totalBooked: number;
  nextWhenLabel: string | null;
  slots: TrainingStudentSlotView[];
};

function statusLabel(status: string) {
  if (status === "CONFIRMED") return "Active";
  if (status === "PAYMENT_PENDING") return "Payment pending";
  if (status === "CANCELLED") return "Cancelled";
  return status;
}

function slotStatusLabel(status: string) {
  if (status === "SCHEDULED") return "Scheduled";
  if (status === "COMPLETED") return "Done";
  if (status === "CANCELLED") return "Cancelled";
  return status;
}

function durationLabel(minutes: number) {
  if (minutes === 180) return "3 hours";
  if (minutes === 90) return "1.5 hours";
  if (minutes === 60) return "1 hour";
  if (minutes === 120) return "2 hours";
  return `${minutes} min`;
}

export function TrainingStudentsPanel({
  students,
}: {
  students: TrainingStudentView[];
}) {
  const [openId, setOpenId] = useState<string | null>(
    students.length === 1 ? students[0]!.id : null,
  );
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((student) => {
      const haystack = [student.name, student.phone, student.email, student.daysLabel]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [students, query]);

  if (students.length === 0) {
    return (
      <p className="ws-apple-record-empty">
        No active training students yet. Book from CRM → Training tab or Approvals
        (confirm payment).
      </p>
    );
  }

  return (
    <div className="training-students">
      <div className="training-students-toolbar">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter active students…"
          aria-label="Filter active students"
        />
        <span className="training-students-count">
          {visible.length} active student{visible.length === 1 ? "" : "s"}
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="ws-apple-record-empty">No students match this filter.</p>
      ) : (
        <ul className="training-students-list">
          {visible.map((student) => {
            const open = openId === student.id;
            return (
              <li
                key={student.id}
                className={`training-student-card${open ? " is-open" : ""}`}
              >
                <button
                  type="button"
                  className="training-student-head"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : student.id)}
                >
                  <span className="training-student-avatar" aria-hidden>
                    {(student.name.trim()[0] || "?").toUpperCase()}
                  </span>
                  <span className="training-student-copy">
                    <strong>{student.name}</strong>
                    <span>
                      {student.daysLabel} · {student.sessionTimeIst} IST ·{" "}
                      {durationLabel(student.sessionDurationMin)}
                    </span>
                    <span className="training-student-meta">
                      {statusLabel(student.status)} · {student.upcomingCount} upcoming
                      {student.nextWhenLabel
                        ? ` · next ${student.nextWhenLabel}`
                        : ""}
                    </span>
                  </span>
                  <ChevronDown
                    className="training-student-chevron"
                    size={18}
                    aria-hidden
                  />
                </button>

                {open ? (
                  <div className="training-student-body">
                    <div className="training-student-actions">
                      {student.joinUrl ? (
                        <a
                          className="ws-btn ws-btn-primary"
                          href={student.joinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Video size={16} aria-hidden />
                          Link to join
                        </a>
                      ) : (
                        <span className="training-join-missing">
                          No Meet link yet — add it on the CRM Training tab.
                        </span>
                      )}
                      {student.inboundLeadId ? (
                        <Link
                          className="ws-btn ws-btn-secondary"
                          href={`/app/leads?leadId=${student.inboundLeadId}`}
                        >
                          Open lead
                        </Link>
                      ) : null}
                      {student.bookingToken ? (
                        <a
                          className="ws-btn ws-btn-secondary"
                          href={`/courses/book-slots?token=${student.bookingToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Client page
                          <ExternalLink size={14} aria-hidden />
                        </a>
                      ) : null}
                    </div>

                    <dl className="training-student-summary">
                      <div>
                        <dt>Days</dt>
                        <dd>{student.daysLabel}</dd>
                      </div>
                      <div>
                        <dt>Frequency</dt>
                        <dd>
                          {student.frequency === "BIWEEKLY"
                            ? "Every other week"
                            : "Weekly"}
                        </dd>
                      </div>
                      <div>
                        <dt>Time</dt>
                        <dd>{student.sessionTimeIst} IST</dd>
                      </div>
                      <div>
                        <dt>Sessions</dt>
                        <dd>
                          {student.totalBooked} booked
                          {student.totalSessions
                            ? ` / ${student.totalSessions} planned`
                            : ""}
                          {student.completedCount
                            ? ` · ${student.completedCount} done`
                            : ""}
                        </dd>
                      </div>
                      <div>
                        <dt>Contact</dt>
                        <dd>
                          {student.phone} · {student.email}
                        </dd>
                      </div>
                    </dl>

                    <h3 className="training-schedule-title">Schedules</h3>
                    {student.slots.length === 0 ? (
                      <p className="ws-apple-record-empty">No sessions on file.</p>
                    ) : (
                      <div className="ws-ims-table-wrap">
                        <table className="ws-ims-table ws-apple-data-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>When (IST)</th>
                              <th>Status</th>
                              <th>Link to join</th>
                            </tr>
                          </thead>
                          <tbody>
                            {student.slots.map((slot) => (
                              <tr key={slot.id}>
                                <td>{slot.sessionNumber}</td>
                                <td className="ws-apple-cell-primary">
                                  {slot.whenLabel}
                                </td>
                                <td>{slotStatusLabel(slot.status)}</td>
                                <td>
                                  {slot.joinUrl ? (
                                    <a
                                      href={slot.joinUrl}
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
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
