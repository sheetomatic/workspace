"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Bell, ChevronDown, ExternalLink, Video } from "lucide-react";
import {
  saveCrmMeetingDetailsAction,
  sendCrmMeetingReminderAction,
} from "@/app/app/leads/actions";
import { crmLeadOpenHref } from "@/lib/leads/crm-open";
import {
  addIstMonths,
  filterCrmMeetings,
  istYmd,
  meetingViewTitle,
  monthGrid,
  monthLabel,
  type CrmMeetingView,
} from "@/lib/leads/crm-meetings";
import "./crm-module-rows.css";
import "./crm-meetings-calendar.css";

export type CrmCalendarMeeting = {
  id: string;
  leadId: string;
  name: string;
  phone: string;
  whenLabel: string;
  ymd: string;
  typeLabel: string;
  assignee: string;
  meetUrl: string | null;
  notes: string;
  isToday: boolean;
  completed: boolean;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CrmMeetingsCalendar({
  meetings,
  canManage,
  view,
  selectedDate,
}: {
  meetings: CrmCalendarMeeting[];
  canManage: boolean;
  view: CrmMeetingView;
  selectedDate?: string | null;
}) {
  const router = useRouter();
  const todayYmd = istYmd(new Date());
  const [month, setMonth] = useState(
    (selectedDate && selectedDate.slice(0, 7)) || todayYmd.slice(0, 7),
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function saveDetails(formData: FormData) {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const result = await saveCrmMeetingDetailsAction(formData);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage(result.message);
      router.refresh();
    });
  }

  function sendReminder(followUpId: string) {
    setRemindingId(followUpId);
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const result = await sendCrmMeetingReminderAction(followUpId);
      setRemindingId(null);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage(result.message);
      router.refresh();
    });
  }

  const byDay = useMemo(() => {
    const map = new Map<string, CrmCalendarMeeting[]>();
    for (const meeting of meetings) {
      const list = map.get(meeting.ymd) ?? [];
      list.push(meeting);
      map.set(meeting.ymd, list);
    }
    return map;
  }, [meetings]);

  const selectedYmd =
    view === "day" && selectedDate ? selectedDate : todayYmd;
  const visible = filterCrmMeetings(meetings, view, { date: selectedDate });
  const cells = monthGrid(month);

  return (
    <div className="crm-meet-cal">
      <section className="crm-meet-cal-today" aria-label="Meeting list">
        <p className="crm-meet-cal-kicker">
          {view === "day" ? selectedYmd : view}
        </p>
        <h3>{meetingViewTitle(view, visible.length, selectedDate)}</h3>
        {visible.length === 0 ? (
          <p className="crm-meet-cal-empty-today">
            No meetings in this view. Pick another number or a date on the calendar.
          </p>
        ) : (
          <MeetingRows
            meetings={visible}
            canManage={canManage}
            openId={openId}
            pending={pending}
            remindingId={remindingId}
            onToggle={setOpenId}
            onSave={saveDetails}
            onRemind={sendReminder}
          />
        )}
      </section>

      <section className="crm-meet-cal-board" aria-label="Upcoming meetings calendar">
        <div className="crm-meet-cal-nav">
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => setMonth(addIstMonths(month, -1))}
          >
            Previous
          </button>
          <h3>{monthLabel(month)}</h3>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => setMonth(addIstMonths(month, 1))}
          >
            Next
          </button>
        </div>
        <div className="crm-meet-cal-weekdays">
          {WEEKDAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="crm-meet-cal-grid">
          {cells.map((cell, index) => {
            if (!cell.ymd) {
              return <div key={`pad-${index}`} className="crm-meet-cal-cell is-pad" />;
            }
            const count = byDay.get(cell.ymd)?.length ?? 0;
            const isToday = cell.ymd === todayYmd;
            const isSelected = cell.ymd === selectedYmd;
            const isPast = cell.ymd < todayYmd;
            return (
              <button
                key={cell.ymd}
                type="button"
                className={`crm-meet-cal-cell${isToday ? " is-today" : ""}${
                  isSelected ? " is-selected" : ""
                }${count ? " has-meetings" : ""}${isPast ? " is-past" : ""}`}
                onClick={() => {
                  setMonth(cell.ymd!.slice(0, 7));
                  router.push(`/app/leads/meetings?view=day&date=${cell.ymd}`);
                }}
              >
                <span>{cell.day}</span>
                {count ? <em>{count}</em> : null}
              </button>
            );
          })}
        </div>
      </section>

      {message ? <p className="crm-meet-cal-msg is-ok">{message}</p> : null}
      {error ? <p className="crm-meet-cal-msg is-err">{error}</p> : null}
    </div>
  );
}

function MeetingRows({
  meetings,
  canManage,
  openId,
  pending,
  remindingId,
  onToggle,
  onSave,
  onRemind,
}: {
  meetings: CrmCalendarMeeting[];
  canManage: boolean;
  openId: string | null;
  pending: boolean;
  remindingId: string | null;
  onToggle: (id: string | null) => void;
  onSave: (formData: FormData) => void;
  onRemind: (followUpId: string) => void;
}) {
  return (
    <ul className="crm-meet-rows">
      {meetings.map((meeting) => (
        <MeetingRow
          key={meeting.id}
          meeting={meeting}
          canManage={canManage}
          open={openId === meeting.id}
          pending={pending}
          reminding={remindingId === meeting.id}
          onToggle={() => onToggle(openId === meeting.id ? null : meeting.id)}
          onSave={onSave}
          onRemind={onRemind}
        />
      ))}
    </ul>
  );
}

function MeetingRow({
  meeting,
  canManage,
  open,
  pending,
  reminding,
  onToggle,
  onSave,
  onRemind,
}: {
  meeting: CrmCalendarMeeting;
  canManage: boolean;
  open: boolean;
  pending: boolean;
  reminding: boolean;
  onToggle: () => void;
  onSave: (formData: FormData) => void;
  onRemind: (followUpId: string) => void;
}) {
  return (
    <li className={`crm-meet-row${meeting.isToday ? " is-today" : ""}${meeting.completed ? " is-done" : ""}${open ? " is-open" : ""}`}>
      <div className="crm-meet-row-main">
        <button
          type="button"
          className="crm-meet-row-toggle"
          aria-expanded={open}
          onClick={onToggle}
        >
          <ChevronDown size={16} aria-hidden />
          <span className="crm-meet-row-who">
            <strong>{meeting.name}</strong>
            <span>
              {meeting.whenLabel}
              {meeting.phone ? ` · ${meeting.phone}` : ""}
            </span>
          </span>
          <em>{meeting.typeLabel}</em>
        </button>
        <div className="crm-meet-row-actions">
          {meeting.meetUrl ? (
            <a
              className="btn-primary btn-sm"
              href={meeting.meetUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Video size={14} aria-hidden />
              Join
            </a>
          ) : (
            <span className="crm-meet-missing">No Meet link</span>
          )}
          {meeting.completed ? null : (
            <button
              type="button"
              className="btn-secondary btn-sm"
              disabled={reminding || pending}
              onClick={() => onRemind(meeting.id)}
            >
              <Bell size={14} aria-hidden />
              {reminding ? "Sending…" : "Remind"}
            </button>
          )}
          <Link
            className="btn-secondary btn-sm"
            href={crmLeadOpenHref(meeting.leadId, { tab: "meeting" })}
          >
            Open
            <ExternalLink size={14} aria-hidden />
          </Link>
        </div>
      </div>

      {open ? (
        <div className="crm-meet-row-body">
          {meeting.assignee ? (
            <p className="crm-meet-notes">Assigned · {meeting.assignee}</p>
          ) : null}
          {canManage ? (
            <form
              className="crm-meet-save"
              onSubmit={(event) => {
                event.preventDefault();
                onSave(new FormData(event.currentTarget));
              }}
            >
              <label>
                Google Meet link
                <input
                  name="meetUrl"
                  type="url"
                  defaultValue={meeting.meetUrl ?? ""}
                  placeholder="https://meet.google.com/…"
                />
              </label>
              <label>
                Meeting details
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={meeting.notes}
                  placeholder="What you discussed, next step, who joined…"
                />
              </label>
              <input name="followUpId" type="hidden" value={meeting.id} />
              <button className="btn-primary btn-sm" disabled={pending} type="submit">
                {pending ? "Saving…" : "Save details"}
              </button>
            </form>
          ) : meeting.notes ? (
            <p className="crm-meet-notes">{meeting.notes}</p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
