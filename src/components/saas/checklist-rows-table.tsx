"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  completeChecklistOccurrenceAction,
  deleteChecklistTemplateAction,
  updateChecklistTemplateAction,
} from "@/app/app/checklists/actions";
import { fmsInitialState as checklistInitialState } from "@/lib/fms-action-state";
import {
  CHECKLIST_FREQUENCY_LABELS,
  CHECKLIST_TEAM_LABELS,
} from "@/lib/checklists/constants";
import type { ChecklistPcRow } from "@/lib/checklists/pc-rows";
import { AiVoiceTextarea } from "@/components/saas/ai-voice-textarea";
import type { ChecklistFrequency, ChecklistTeam } from "@prisma/client";

const WEEKDAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

type Member = { id: string; label: string };

function mergeMembers(members: Member[], rows: ChecklistPcRow[]) {
  const map = new Map(members.map((member) => [member.id, member]));
  for (const row of rows) {
    if (!map.has(row.doerId)) {
      map.set(row.doerId, { id: row.doerId, label: row.doerLabel });
    }
  }
  return Array.from(map.values());
}

function MarkDonePanel({ row }: { row: ChecklistPcRow }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    completeChecklistOccurrenceAction,
    checklistInitialState,
  );

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [state.ok, router]);

  if (!row.occurrenceId) {
    return <p className="ws-pc-row-hint">No open run this cycle.</p>;
  }

  if (!row.canMarkDone) {
    return <p className="ws-pc-row-hint">Only {row.doerLabel} can mark this done.</p>;
  }

  return (
    <form action={formAction} className="ws-pc-row-done-form">
      <input name="occurrenceId" type="hidden" value={row.occurrenceId} />
      <AiVoiceTextarea
        defaultValue={row.notes ?? ""}
        name="notes"
        placeholder="Proof or remarks — type or use Voice"
      />
      <button className="btn-primary btn-sm ws-sf-btn-primary" disabled={pending} type="submit">
        {pending ? "Saving..." : "Mark done"}
      </button>
      {state.message ? (
        <p className={state.ok ? "ws-form-success" : "ws-form-error"}>{state.message}</p>
      ) : null}
    </form>
  );
}

function EditPanel({ row, members }: { row: ChecklistPcRow; members: Member[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateChecklistTemplateAction,
    checklistInitialState,
  );
  const [frequency, setFrequency] = useState<ChecklistFrequency>(row.frequency);
  const [team, setTeam] = useState<ChecklistTeam>(row.team);

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [state.ok, router]);

  const showWeekday = frequency === "WEEKLY" || frequency === "FORTNIGHTLY";
  const showMonthDay =
    frequency === "MONTHLY" || frequency === "QUARTERLY" || frequency === "HALF_YEARLY";
  const showYearMonth = frequency === "YEARLY";

  return (
    <form action={formAction} className="ws-pc-row-edit-form">
      <input name="templateId" type="hidden" value={row.templateId} />
      <label>
        <span>Task</span>
        <input name="title" required defaultValue={row.title} />
      </label>
      <label>
        <span>Doer</span>
        <select name="assigneeUserId" defaultValue={row.doerId} required>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Department</span>
        <select
          name="team"
          value={team}
          onChange={(event) => setTeam(event.target.value as ChecklistTeam)}
        >
          {Object.keys(CHECKLIST_TEAM_LABELS).map((value) => (
            <option key={value} value={value}>
              {CHECKLIST_TEAM_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Frequency</span>
        <select
          name="frequency"
          value={frequency}
          onChange={(event) => setFrequency(event.target.value as ChecklistFrequency)}
        >
          {(Object.keys(CHECKLIST_FREQUENCY_LABELS) as ChecklistFrequency[]).map((value) => (
            <option key={value} value={value}>
              {CHECKLIST_FREQUENCY_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      {showWeekday ? (
        <label>
          <span>Day</span>
          <select name="dueWeekday" defaultValue={row.dueWeekday ?? 1}>
            {WEEKDAYS.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input name="dueWeekday" type="hidden" value={row.dueWeekday ?? 1} />
      )}
      {showMonthDay || showYearMonth ? (
        <label>
          <span>Date</span>
          <input
            name="dueMonthDay"
            type="number"
            min={1}
            max={31}
            defaultValue={row.dueMonthDay ?? 1}
          />
        </label>
      ) : (
        <input name="dueMonthDay" type="hidden" value={row.dueMonthDay ?? 1} />
      )}
      {showYearMonth ? (
        <input name="dueMonth" type="hidden" value={row.dueMonth ?? 4} />
      ) : (
        <input name="dueMonth" type="hidden" value={row.dueMonth ?? 4} />
      )}
      <label className="ws-pc-row-edit-wide">
        <span>Instructions</span>
        <textarea name="instructions" rows={2} defaultValue={row.instructions ?? ""} />
      </label>
      <div className="ws-pc-row-edit-actions">
        <button className="btn-primary btn-sm ws-sf-btn-primary" disabled={pending} type="submit">
          {pending ? "Saving..." : "Save"}
        </button>
      </div>
      {state.message ? (
        <p className={state.ok ? "ws-form-success" : "ws-form-error"}>{state.message}</p>
      ) : null}
    </form>
  );
}

function DeleteForm({ row }: { row: ChecklistPcRow }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    deleteChecklistTemplateAction,
    checklistInitialState,
  );

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(`Delete “${row.title}”? This hides it from the checklist.`)) {
          event.preventDefault();
        }
      }}
    >
      <input name="templateId" type="hidden" value={row.templateId} />
      <button className="ws-pc-row-link is-danger" disabled={pending} type="submit">
        {pending ? "Deleting..." : "Delete"}
      </button>
      {state.message && !state.ok ? <p className="ws-form-error">{state.message}</p> : null}
    </form>
  );
}

function ChecklistPcRowActions({
  row,
  canManage,
  members,
}: {
  row: ChecklistPcRow;
  canManage: boolean;
  members: Member[];
}) {
  const [open, setOpen] = useState<"done" | "edit" | null>(null);

  return (
    <div className="ws-pc-row-actions">
      <div className="ws-pc-row-action-bar">
        {row.canMarkDone ? (
          <button
            type="button"
            className="ws-pc-row-link"
            aria-expanded={open === "done"}
            onClick={() => setOpen(open === "done" ? null : "done")}
          >
            Mark done
          </button>
        ) : null}
        {canManage ? (
          <>
            <button
              type="button"
              className="ws-pc-row-link"
              aria-expanded={open === "edit"}
              onClick={() => setOpen(open === "edit" ? null : "edit")}
            >
              Edit
            </button>
            <DeleteForm row={row} />
          </>
        ) : null}
        {!row.canMarkDone && !canManage ? <span className="ws-pc-row-muted">—</span> : null}
      </div>
      {open === "done" ? <MarkDonePanel row={row} /> : null}
      {open === "edit" ? <EditPanel row={row} members={members} /> : null}
    </div>
  );
}

export function ChecklistRowsTable({
  rows,
  canManage,
  members,
  emptyMessage,
}: {
  rows: ChecklistPcRow[];
  canManage: boolean;
  members: Member[];
  emptyMessage: string;
}) {
  const editMembers = mergeMembers(members, rows);
  if (rows.length === 0) {
    return (
      <div className="ws-empty-state ws-fms-empty-state">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="ws-sf-table-wrap ws-pc-rows-wrap">
      <table className="ws-fms-data-table ws-sf-data-table ws-pc-rows-table">
        <thead>
          <tr>
            <th>Actions</th>
            <th>Task</th>
            <th>Doer</th>
            <th>Department</th>
            <th>Frequency</th>
            <th>Day/Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.templateId}
              className={row.overdue ? "is-overdue" : undefined}
            >
              <td data-label="Actions">
                <ChecklistPcRowActions
                  canManage={canManage}
                  members={editMembers}
                  row={row}
                />
              </td>
              <td data-label="Task">
                <strong>{row.title}</strong>
                {row.overdue ? (
                  <span className="ws-pc-row-overdue">Overdue</span>
                ) : null}
              </td>
              <td data-label="Doer">{row.doerLabel}</td>
              <td data-label="Department">{row.teamLabel}</td>
              <td data-label="Frequency">{row.frequencyLabel}</td>
              <td data-label="Day/Date">{row.dueDateLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
