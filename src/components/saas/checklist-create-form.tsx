"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  checklistInitialState,
  createChecklistTemplateAction,
} from "@/app/app/checklists/actions";
import {
  CHECKLIST_FREQUENCY_LABELS,
  CHECKLIST_TEAM_LABELS,
} from "@/lib/checklists/constants";
import { PC_AI_STARTERS } from "@/lib/checklists/ai-starters";
import { applyChecklistDraftToForm, PcAiPanel } from "@/components/saas/pc-ai-panel";
import type { ChecklistFrequency, ChecklistTeam } from "@prisma/client";

const teams = Object.keys(CHECKLIST_TEAM_LABELS) as ChecklistTeam[];
const frequencies = Object.keys(CHECKLIST_FREQUENCY_LABELS) as ChecklistFrequency[];

const WEEKDAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function teamFromStarter(team: string): ChecklistTeam {
  const map: Record<string, ChecklistTeam> = {
    Accounts: "ACCOUNTS",
    HR: "HR",
    Maintenance: "MAINTENANCE",
    Quality: "QUALITY",
    Store: "STORE",
  };
  return map[team] ?? "GENERAL";
}

export function ChecklistCreateForm({
  members,
}: {
  members: Array<{ id: string; name: string | null; email: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const starter = useMemo(
    () => PC_AI_STARTERS.find((row) => row.id === searchParams.get("starter")),
    [searchParams],
  );

  const [state, formAction, pending] = useActionState(
    createChecklistTemplateAction,
    checklistInitialState,
  );

  const [frequency, setFrequency] = useState<ChecklistFrequency>("MONTHLY");
  const [title, setTitle] = useState(starter?.label ?? "");
  const [instructions, setInstructions] = useState(starter?.prompt ?? "");
  const [team, setTeam] = useState<ChecklistTeam>(
    starter ? teamFromStarter(starter.team) : "ACCOUNTS",
  );
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [remindViaEmail, setRemindViaEmail] = useState(true);
  const [dueMonthDay, setDueMonthDay] = useState(5);
  const [dueWeekday, setDueWeekday] = useState(1);
  const [dueMonth, setDueMonth] = useState(4);

  useEffect(() => {
    const raw = sessionStorage.getItem("pc-ai-draft");
    if (!raw) {
      return;
    }
    try {
      const draft = JSON.parse(raw) as Parameters<typeof applyChecklistDraftToForm>[0];
      applyChecklistDraftToForm(draft, {
        setTitle,
        setInstructions,
        setFrequency,
        setTeam,
        setAssigneeUserId,
        setRemindViaEmail,
        setDueMonthDay,
        setDueWeekday,
        setDueMonth,
      });
      sessionStorage.removeItem("pc-ai-draft");
    } catch {
      sessionStorage.removeItem("pc-ai-draft");
    }
  }, []);

  useEffect(() => {
    if (starter) {
      setTitle(starter.label);
      setInstructions(starter.prompt);
      setTeam(teamFromStarter(starter.team));
    }
  }, [starter]);

  useEffect(() => {
    if (state.ok) {
      router.push("/app/checklists/setup");
      router.refresh();
    }
  }, [state.ok, router]);

  const showWeekday =
    frequency === "WEEKLY" || frequency === "FORTNIGHTLY";
  const showMonthDay =
    frequency === "MONTHLY" ||
    frequency === "QUARTERLY" ||
    frequency === "HALF_YEARLY";
  const showYearMonth = frequency === "YEARLY";

  return (
    <form action={formAction} className="ws-pc-config-form">
      <PcAiPanel
        onDraft={(draft) =>
          applyChecklistDraftToForm(draft, {
            setTitle,
            setInstructions,
            setFrequency,
            setTeam,
            setAssigneeUserId,
            setRemindViaEmail,
            setDueMonthDay,
            setDueWeekday,
            setDueMonth,
          })
        }
      />

      {starter ? (
        <div className="ws-pc-config-ai-banner">
          <strong>Starter: {starter.label}</strong>
          <p>{starter.summary}</p>
        </div>
      ) : null}

      <section className="saas-form-panel ws-pc-config-section">
        <h3>Checklist details</h3>
        <p className="ws-pc-config-section-lead">
          Name the recurring duty and which team owns it.
        </p>
        <div className="ws-pc-config-grid">
          <label className="ws-pc-config-field ws-pc-config-field-wide">
            <span>Title</span>
            <input
              name="title"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. GST return filing"
            />
          </label>

          <label className="ws-pc-config-field">
            <span>Team</span>
            <select
              name="team"
              value={team}
              onChange={(event) => setTeam(event.target.value as ChecklistTeam)}
            >
              {teams.map((team) => (
                <option key={team} value={team}>
                  {CHECKLIST_TEAM_LABELS[team]}
                </option>
              ))}
            </select>
          </label>

          <label className="ws-pc-config-field ws-pc-config-field-wide">
            <span>Instructions for doer</span>
            <textarea
              name="instructions"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              placeholder="What to complete and what proof to attach"
              rows={3}
            />
          </label>
        </div>
      </section>

      <section className="saas-form-panel ws-pc-config-section">
        <h3>Schedule</h3>
        <p className="ws-pc-config-section-lead">
          When this checklist is due each cycle. PC sends reminders if overdue.
        </p>
        <div className="ws-pc-config-grid">
          <label className="ws-pc-config-field">
            <span>Frequency</span>
            <select
              name="frequency"
              value={frequency}
              onChange={(event) =>
                setFrequency(event.target.value as ChecklistFrequency)
              }
            >
              {frequencies.map((value) => (
                <option key={value} value={value}>
                  {CHECKLIST_FREQUENCY_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          {showWeekday ? (
            <label className="ws-pc-config-field">
              <span>Due weekday</span>
              <select
                name="dueWeekday"
                value={dueWeekday}
                onChange={(event) => setDueWeekday(Number(event.target.value))}
              >
                {WEEKDAYS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <input name="dueWeekday" type="hidden" value={dueWeekday} />
          )}

          {showMonthDay ? (
            <label className="ws-pc-config-field">
              <span>Due day of month</span>
              <input
                max={31}
                min={1}
                name="dueMonthDay"
                type="number"
                value={dueMonthDay}
                onChange={(event) => setDueMonthDay(Number(event.target.value))}
              />
            </label>
          ) : (
            <input name="dueMonthDay" type="hidden" value={dueMonthDay} />
          )}

          {showYearMonth ? (
            <>
              <label className="ws-pc-config-field">
                <span>Due month</span>
                <select
                  name="dueMonth"
                  value={dueMonth}
                  onChange={(event) => setDueMonth(Number(event.target.value))}
                >
                  {MONTHS.map((month, index) => (
                    <option key={month} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ws-pc-config-field">
                <span>Due day</span>
                <input
                  max={31}
                  min={1}
                  name="dueMonthDay"
                  type="number"
                  value={dueMonthDay}
                  onChange={(event) => setDueMonthDay(Number(event.target.value))}
                />
              </label>
            </>
          ) : (
            <input name="dueMonth" type="hidden" value={dueMonth} />
          )}
        </div>
      </section>

      <section className="saas-form-panel ws-pc-config-section">
        <h3>Assignment</h3>
        <p className="ws-pc-config-section-lead">
          Who completes this checklist each cycle.
        </p>
        <div className="ws-pc-config-grid">
          <label className="ws-pc-config-field ws-pc-config-field-wide">
            <span>Doer</span>
            <select
              name="assigneeUserId"
              required
              value={assigneeUserId}
              onChange={(event) => setAssigneeUserId(event.target.value)}
            >
              <option value="" disabled>
                Select team member
              </option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name ?? member.email}
                </option>
              ))}
            </select>
          </label>

          <label className="ws-pc-config-field-check ws-pc-config-field-wide">
            <input
              checked={remindViaEmail}
              name="remindViaEmail"
              onChange={(event) => setRemindViaEmail(event.target.checked)}
              type="checkbox"
            />
            <span>Email reminder when pending or overdue</span>
          </label>
        </div>
      </section>

      {state.message ? (
        <p className={state.ok ? "ws-form-success" : "ws-form-error"}>{state.message}</p>
      ) : null}

      <div className="ws-pc-config-actions">
        <button className="btn-primary ws-sf-btn-primary" disabled={pending} type="submit">
          {pending ? "Saving..." : "Save checklist"}
        </button>
      </div>
    </form>
  );
}
