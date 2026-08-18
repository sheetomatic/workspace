"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState, useTransition } from "react";
import { ChevronDown, Copy, ExternalLink, Mail, MessageCircle, Video } from "lucide-react";
import {
  resendTrainingScheduleAction,
  saveTrainingGroupClassAction,
  saveTrainingMeetUrlAction,
  sendTrainingScheduleWhatsAppAction,
  updateLeadTrainingSlotStatusAction,
} from "@/app/app/leads/actions";
import { TrainingSlotContentEditor } from "@/components/saas/training-slot-content-editor";
import type { TrainingMaterialView } from "@/lib/courses/session-materials";
import { teacherClassPath } from "@/lib/learn/classroom";
import {
  buildGroupLoginShareText,
  buildStudentLoginShareText,
} from "@/lib/learn/group-class";
import {
  learnPortalOrigin,
  workspacePortalOrigin,
} from "@/lib/workspace-auth-links";

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
  classroomLive: boolean;
  materials: TrainingMaterialView[];
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
  groupMeetUrl: string | null;
  groupLabel: string | null;
  groupKey: string | null;
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

type SlotStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";

export function TrainingStudentsPanel({
  students,
  canManage = false,
}: {
  students: TrainingStudentView[];
  canManage?: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(
    students.length === 1 ? students[0]!.id : null,
  );
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [meetDraft, setMeetDraft] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [groupMeetDraft, setGroupMeetDraft] = useState("");
  const [groupLabelDraft, setGroupLabelDraft] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  // Instant feedback while the server data refreshes in the background.
  const [statusOverride, setStatusOverride] = useState<Record<string, SlotStatus>>({});
  const [contentSlotId, setContentSlotId] = useState<string | null>(null);
  const router = useRouter();

  function shareInput(student: TrainingStudentView) {
    return {
      name: student.name,
      email: student.email,
      phone: student.phone,
      bookingToken: student.bookingToken,
      groupMeetUrl: student.groupMeetUrl,
      groupLabel: student.groupLabel,
    };
  }

  async function copyShare(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setError(null);
      setNotice("Copied. Paste on WhatsApp to share — no password, email + WhatsApp or the token link.");
    } catch {
      setError("Could not copy. Select the text and copy manually.");
    }
  }

  function runContent(work: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const result = await work();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setNotice(result.message);
      router.refresh();
    });
  }

  function onSlotStatus(slotId: string, status: SlotStatus) {
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const result = await updateLeadTrainingSlotStatusAction(slotId, status);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setStatusOverride((current) => ({ ...current, [slotId]: status }));
      if (status === "COMPLETED") setContentSlotId(slotId);
      router.refresh();
    });
  }

  function resolveMeetInput(student: TrainingStudentView) {
    return (meetDraft[student.id] ?? student.joinUrl ?? "").trim();
  }

  function onSaveMeetAndSend(student: TrainingStudentView) {
    const meetUrl = resolveMeetInput(student);
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const result = await saveTrainingMeetUrlAction({
        enrollmentId: student.id,
        meetUrl,
        resend: true,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setNotice(result.message);
      router.refresh();
    });
  }

  function onResendSchedule(enrollmentId: string) {
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const result = await resendTrainingScheduleAction(enrollmentId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setNotice(result.message);
    });
  }

  function onSendWhatsApp(student: TrainingStudentView) {
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const meetUrl = resolveMeetInput(student);
      if (meetUrl) {
        const saved = await saveTrainingMeetUrlAction({
          enrollmentId: student.id,
          meetUrl,
          resend: false,
        });
        if (!saved.ok) {
          setError(saved.message);
          return;
        }
      }
      const result = await sendTrainingScheduleWhatsAppAction(student.id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setNotice(result.message);
    });
  }

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

  const selectedStudents = useMemo(
    () => visible.filter((student) => selectedIds[student.id]),
    [visible, selectedIds],
  );

  function toggleSelected(studentId: string, checked: boolean) {
    setSelectedIds((current) => ({ ...current, [studentId]: checked }));
  }

  function selectAllVisible() {
    setSelectedIds((current) => {
      const next = { ...current };
      for (const student of visible) next[student.id] = true;
      return next;
    });
  }

  function onSaveGroupClass(clear = false) {
    if (selectedStudents.length === 0) {
      setError("Select at least one student for the group class.");
      return;
    }
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const result = await saveTrainingGroupClassAction({
        enrollmentIds: selectedStudents.map((student) => student.id),
        groupMeetUrl: groupMeetDraft,
        groupLabel: groupLabelDraft,
        clear,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setNotice(result.message);
      router.refresh();
    });
  }

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
          {selectedStudents.length
            ? ` · ${selectedStudents.length} selected`
            : ""}
        </span>
      </div>

      {canManage ? (
        <div className="training-group-class">
          <div>
            <strong>Group class</strong>
            <p>
              Paste one Meet/join URL. Every selected student sees the same
              link on Learn. Start class on any of them opens one in-panel
              room the whole group can Join.
            </p>
          </div>
          <label>
            Group Meet / join URL
            <input
              type="url"
              placeholder="https://meet.google.com/…"
              value={groupMeetDraft}
              onChange={(event) => setGroupMeetDraft(event.target.value)}
            />
          </label>
          <label>
            Group label (optional)
            <input
              type="text"
              placeholder="e.g. Tuesday evening"
              value={groupLabelDraft}
              onChange={(event) => setGroupLabelDraft(event.target.value)}
            />
          </label>
          <div className="training-group-class-actions">
            <button
              type="button"
              className="ws-btn ws-btn-secondary"
              onClick={selectAllVisible}
            >
              Select all visible
            </button>
            <button
              type="button"
              className="ws-btn ws-btn-primary"
              disabled={pending}
              onClick={() => onSaveGroupClass(false)}
            >
              {pending ? "Saving…" : "Apply group link"}
            </button>
            <button
              type="button"
              className="ws-btn ws-btn-secondary"
              disabled={pending}
              onClick={() => onSaveGroupClass(true)}
            >
              Remove from selected
            </button>
            <button
              type="button"
              className="ws-btn ws-btn-secondary"
              disabled={selectedStudents.length === 0}
              onClick={() =>
                copyShare(
                  buildGroupLoginShareText(selectedStudents.map(shareInput)),
                  "group",
                )
              }
            >
              <Copy size={16} aria-hidden />
              {copiedKey === "group" ? "Copied logins" : "Copy selected logins"}
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="saas-form-message error">{error}</p> : null}
      {notice ? <p className="saas-form-message ok">{notice}</p> : null}

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
                <div className="training-student-head-row">
                  {canManage ? (
                    <label className="training-student-select">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedIds[student.id])}
                        onChange={(event) =>
                          toggleSelected(student.id, event.target.checked)
                        }
                        aria-label={`Select ${student.name} for group class`}
                      />
                    </label>
                  ) : null}
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
                      <strong>
                        {student.name}
                        {student.groupMeetUrl ? (
                          <em className="training-group-badge">
                            {student.groupLabel?.trim()
                              ? student.groupLabel
                              : "Group class"}
                          </em>
                        ) : null}
                      </strong>
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
                  <button
                    type="button"
                    className="ws-btn ws-btn-secondary training-copy-login"
                    onClick={() =>
                      copyShare(
                        buildStudentLoginShareText(shareInput(student)),
                        student.id,
                      )
                    }
                    title="Copy Learn login (email + WhatsApp or token link)"
                  >
                    <Copy size={16} aria-hidden />
                    {copiedKey === student.id ? "Copied" : "Copy login"}
                  </button>
                </div>

                {open ? (
                  <div className="training-student-body">
                    <div className="training-student-actions">
                      {canManage ? (
                        <button
                          type="button"
                          className="ws-btn ws-btn-primary training-wa-btn"
                          disabled={pending}
                          onClick={() => onSendWhatsApp(student)}
                          title="Send schedule + Google Meet on WhatsApp"
                        >
                          <MessageCircle size={16} aria-hidden />
                          {pending ? "Sending…" : "WhatsApp"}
                        </button>
                      ) : null}
                      {student.groupMeetUrl ? (
                        <a
                          className="ws-btn ws-btn-primary"
                          href={student.groupMeetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Video size={16} aria-hidden />
                          Join group class
                        </a>
                      ) : null}
                      {student.joinUrl ? (
                        <a
                          className="ws-btn ws-btn-secondary"
                          href={student.joinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Video size={16} aria-hidden />
                          {student.groupMeetUrl ? "1:1 Meet" : "Link to join"}
                        </a>
                      ) : student.groupMeetUrl ? null : (
                        <span className="training-join-missing">
                          No Meet link yet — paste it below, then tap WhatsApp.
                        </span>
                      )}
                      {canManage ? (
                        <button
                          type="button"
                          className="ws-btn ws-btn-secondary"
                          disabled={pending}
                          onClick={() => onResendSchedule(student.id)}
                          title="Email the client schedule"
                        >
                          <Mail size={16} aria-hidden />
                          {pending ? "Sending…" : "Email client"}
                        </button>
                      ) : null}
                      {student.inboundLeadId ? (
                        <Link
                          className="ws-btn ws-btn-secondary"
                          href={`${workspacePortalOrigin()}/app/leads?leadId=${student.inboundLeadId}`}
                        >
                          Open lead
                        </Link>
                      ) : null}
                      {student.bookingToken ? (
                        <>
                          <a
                            className="ws-btn ws-btn-secondary"
                            href={`${learnPortalOrigin()}/learn/login?token=${student.bookingToken}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Student panel
                            <ExternalLink size={14} aria-hidden />
                          </a>
                          <a
                            className="ws-btn ws-btn-secondary"
                            href={`/courses/book-slots?token=${student.bookingToken}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Client page
                            <ExternalLink size={14} aria-hidden />
                          </a>
                        </>
                      ) : null}
                    </div>

                    {canManage ? (
                      <div className="training-meet-resend">
                        <label>
                          Google Meet link
                          <input
                            type="url"
                            placeholder="https://meet.google.com/…"
                            value={
                              meetDraft[student.id] ?? student.joinUrl ?? ""
                            }
                            onChange={(event) =>
                              setMeetDraft((current) => ({
                                ...current,
                                [student.id]: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="ws-btn ws-btn-primary"
                          disabled={pending}
                          onClick={() => onSaveMeetAndSend(student)}
                        >
                          {pending ? "Saving…" : "Save Meet & send WhatsApp"}
                        </button>
                      </div>
                    ) : null}

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
                      {student.groupMeetUrl ? (
                        <div>
                          <dt>Group class</dt>
                          <dd>
                            {student.groupLabel ? `${student.groupLabel} · ` : ""}
                            <a
                              href={student.groupMeetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Join link
                            </a>
                          </dd>
                        </div>
                      ) : null}
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
                              <th>Content</th>
                              {canManage ? <th>Update</th> : null}
                            </tr>
                          </thead>
                          <tbody>
                            {student.slots.map((slot) => {
                              const status = statusOverride[slot.id] ?? slot.status;
                              const recs = slot.materials.filter(
                                (item) => item.kind === "RECORDING",
                              ).length;
                              const docs = slot.materials.filter(
                                (item) => item.kind === "DOCUMENT",
                              ).length;
                              const open = contentSlotId === slot.id;
                              return (
                                <Fragment key={slot.id}>
                                <tr>
                                  <td>{slot.sessionNumber}</td>
                                  <td className="ws-apple-cell-primary">
                                    {slot.whenLabel}
                                  </td>
                                  <td>
                                    {slot.classroomLive
                                      ? "Live"
                                      : slotStatusLabel(status)}
                                  </td>
                                  <td>
                                    {slot.classroomLive && canManage ? (
                                      <Link href={teacherClassPath(slot.id)}>
                                        In panel
                                      </Link>
                                    ) : slot.joinUrl ? (
                                      <a
                                        href={slot.joinUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        Meet
                                      </a>
                                    ) : (
                                      "—"
                                    )}
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      className="ws-btn ws-btn-secondary training-slot-btn"
                                      onClick={() =>
                                        setContentSlotId(open ? null : slot.id)
                                      }
                                    >
                                      {recs || docs
                                        ? `${recs ? `${recs} rec` : ""}${recs && docs ? " · " : ""}${docs ? `${docs} doc` : ""}`
                                        : canManage
                                          ? "Add"
                                          : "—"}
                                    </button>
                                  </td>
                                  {canManage ? (
                                    <td className="training-slot-actions">
                                      {status === "SCHEDULED" ? (
                                        <>
                                          <Link
                                            className="ws-btn ws-btn-primary training-slot-btn"
                                            href={teacherClassPath(slot.id)}
                                          >
                                            {slot.classroomLive
                                              ? "Enter class"
                                              : "Start class"}
                                          </Link>
                                          <button
                                            type="button"
                                            className="ws-btn ws-btn-secondary training-slot-btn"
                                            disabled={pending}
                                            onClick={() =>
                                              onSlotStatus(slot.id, "COMPLETED")
                                            }
                                          >
                                            Mark done
                                          </button>
                                          <button
                                            type="button"
                                            className="ws-btn ws-btn-secondary training-slot-btn"
                                            disabled={pending}
                                            onClick={() =>
                                              onSlotStatus(slot.id, "CANCELLED")
                                            }
                                          >
                                            Cancel
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          type="button"
                                          className="ws-btn ws-btn-secondary training-slot-btn"
                                          disabled={pending}
                                          onClick={() =>
                                            onSlotStatus(slot.id, "SCHEDULED")
                                          }
                                        >
                                          Reopen
                                        </button>
                                      )}
                                    </td>
                                  ) : null}
                                </tr>
                                {open && canManage ? (
                                  <tr>
                                    <td colSpan={canManage ? 6 : 5}>
                                      <TrainingSlotContentEditor
                                        slotId={slot.id}
                                        status={status}
                                        materials={slot.materials}
                                        pending={pending}
                                        run={runContent}
                                      />
                                    </td>
                                  </tr>
                                ) : null}
                                </Fragment>
                              );
                            })}
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
