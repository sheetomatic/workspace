"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { createDelegatedTask } from "@/app/app/tasks/actions";
import { taskActionInitialState } from "@/lib/task-action-state";
import type { ParsedTaskDraft } from "@/lib/integrations/openai";
import {
  TaskRecurrenceFields,
  initMonthDayFromDue,
  initWeeklyDaysFromDue,
} from "@/components/saas/task-recurrence-fields";
import { isRecurringFrequency } from "@/lib/task-schedule";
import {
  TASK_DEPARTMENT_LABELS,
  TASK_FREQUENCY_LABELS,
  TASK_PRIORITY_LABELS,
} from "@/lib/tasks";
import { TaskAiPanel } from "@/components/saas/task-ai-panel";
import { TaskMemberPicker } from "@/components/saas/task-member-picker";

type Member = {
  id: string;
  name: string;
  email: string;
};

function defaultDueLocal() {
  const d = new Date();
  d.setHours(17, 0, 0, 0);
  if (d.getTime() < Date.now()) {
    d.setDate(d.getDate() + 1);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dueLocalFromIso(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return defaultDueLocal();
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TaskCreateForm({ members }: { members: Member[] }) {
  const [state, action, pending] = useActionState(
    createDelegatedTask,
    taskActionInitialState,
  );

  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [assigneeUserIds, setAssigneeUserIds] = useState<string[]>([]);
  const [priority, setPriority] = useState("MEDIUM");
  const [department, setDepartment] = useState("GENERAL");
  const [category, setCategory] = useState("");
  const [dueAt, setDueAt] = useState(defaultDueLocal());
  const [frequency, setFrequency] = useState("ONCE");
  const [isRecurring, setIsRecurring] = useState(false);
  const [weeklyDays, setWeeklyDays] = useState(() =>
    initWeeklyDaysFromDue(defaultDueLocal()),
  );
  const [monthDay, setMonthDay] = useState(() =>
    initMonthDayFromDue(defaultDueLocal()),
  );
  const [remindViaEmail, setRemindViaEmail] = useState(false);
  const [remindViaWhatsApp, setRemindViaWhatsApp] = useState(false);
  const searchParams = useSearchParams();

  function resetForm() {
    setTitle("");
    setInstructions("");
    setAssigneeUserIds([]);
    setPriority("MEDIUM");
    setDepartment("GENERAL");
    setCategory("");
    const due = defaultDueLocal();
    setDueAt(due);
    setFrequency("ONCE");
    setIsRecurring(false);
    setWeeklyDays(initWeeklyDaysFromDue(due));
    setMonthDay(initMonthDayFromDue(due));
    setRemindViaEmail(false);
    setRemindViaWhatsApp(false);
  }

  useEffect(() => {
    if (searchParams.get("assigned") === "1") {
      resetForm();
    }
  }, [searchParams]);

  useEffect(() => {
    if (isRecurringFrequency(frequency as "ONCE")) {
      setIsRecurring(true);
    } else if (frequency === "ONCE") {
      setIsRecurring(false);
    }
  }, [frequency]);

  useEffect(() => {
    if (frequency === "WEEKLY" && weeklyDays.length === 0) {
      setWeeklyDays(initWeeklyDaysFromDue(dueAt));
    }
    if (frequency === "MONTHLY") {
      setMonthDay(initMonthDayFromDue(dueAt));
    }
  }, [dueAt, frequency, weeklyDays.length]);

  function applyDraft(draft: ParsedTaskDraft) {
    setTitle(draft.title);
    setInstructions(draft.instructions);
    if (draft.assigneeUserId) {
      setAssigneeUserIds([draft.assigneeUserId]);
    }
    setPriority(draft.priority);
    setDepartment(draft.department);
    setCategory(draft.category ?? "");
    const localDue = dueLocalFromIso(draft.dueAtIso);
    setDueAt(localDue);
    setFrequency(draft.frequency);
    setIsRecurring(draft.isRecurring);
    if (draft.recurrenceWeeklyDays?.length) {
      setWeeklyDays(draft.recurrenceWeeklyDays);
    } else if (draft.frequency === "WEEKLY") {
      setWeeklyDays(initWeeklyDaysFromDue(localDue));
    }
    if (draft.recurrenceMonthDay) {
      setMonthDay(draft.recurrenceMonthDay);
    } else if (draft.frequency === "MONTHLY") {
      setMonthDay(initMonthDayFromDue(localDue));
    }
    setRemindViaEmail(draft.remindViaEmail);
    setRemindViaWhatsApp(draft.remindViaWhatsApp);
  }

  const showRecurrencePicker =
    isRecurring && (frequency === "WEEKLY" || frequency === "MONTHLY");

  return (
    <div className="ws-task-delegate">
      <TaskAiPanel compact onDraft={applyDraft} />

      <form action={action} className="ws-task-assign-card">
        <section className="ws-form-section ws-form-section-first">
          <h4 className="ws-form-section-title">Details</h4>
          <div className="form-grid-premium">
            <label className="form-field-full">
              Title
              <input
                name="title"
                required
                minLength={3}
                placeholder="Quotation review follow-up"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>

            <label className="form-field-full">
              Instructions
              <textarea
                name="instructions"
                placeholder="Optional context for the owner"
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </label>

            <label>
              Category / Project
              <input
                name="category"
                placeholder="e.g. MIS rollout, Client ABC"
                type="text"
                maxLength={80}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </label>

            <label>
              Priority
              <select
                name="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Department
              <select
                name="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                {Object.entries(TASK_DEPARTMENT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="ws-form-section">
          <h4 className="ws-form-section-title">Assign to</h4>
          <TaskMemberPicker
            members={members}
            selectedIds={assigneeUserIds}
            onChange={setAssigneeUserIds}
          />
        </section>

        <section className="ws-form-section">
          <h4 className="ws-form-section-title">Schedule</h4>
          <div className="form-grid-premium ws-form-section-grid">
            <label>
              Due
              <input
                name="dueAt"
                required
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </label>
          </div>

          <div className="ws-assign-schedule">
            <div className="ws-assign-schedule-top">
              <label>
                Frequency
                <select
                  name="frequency"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                >
                  {Object.entries(TASK_FREQUENCY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ws-task-recurring-opt">
                <input
                  checked={isRecurring}
                  name="isRecurring"
                  type="checkbox"
                  value="1"
                  onChange={(e) => setIsRecurring(e.target.checked)}
                />
                Recurring
              </label>
            </div>

            {showRecurrencePicker ? (
              <TaskRecurrenceFields
                frequency={frequency}
                weeklyDays={weeklyDays}
                monthDay={monthDay}
                onWeeklyDaysChange={setWeeklyDays}
                onMonthDayChange={setMonthDay}
              />
            ) : null}

            {isRecurring && frequency !== "ONCE" ? (
              <p className="ws-task-recurring-hint">
                Next occurrence is created when this task is marked done.
              </p>
            ) : null}
          </div>
        </section>

        <footer className="ws-assign-footer">
          <div className="ws-form-section ws-form-section-inline">
            <h4 className="ws-form-section-title">Reminders</h4>
            <div className="ws-task-reminder-options" aria-label="Send reminders">
              <label className="ws-task-reminder-opt">
                <input
                  checked={remindViaEmail}
                  name="remindViaEmail"
                  type="checkbox"
                  value="1"
                  onChange={(e) => setRemindViaEmail(e.target.checked)}
                />
                Email
              </label>
              <label className="ws-task-reminder-opt">
                <input
                  checked={remindViaWhatsApp}
                  name="remindViaWhatsApp"
                  type="checkbox"
                  value="1"
                  onChange={(e) => setRemindViaWhatsApp(e.target.checked)}
                />
                WhatsApp
              </label>
            </div>
          </div>

          <button
            className="btn-cta btn-primary"
            disabled={pending || assigneeUserIds.length === 0}
            type="submit"
          >
            {pending
              ? "Assigning..."
              : assigneeUserIds.length > 1
                ? `Assign to ${assigneeUserIds.length} people`
                : "Assign task"}
          </button>
        </footer>

        {!state.ok && state.message ? (
          <p className="saas-form-message error">{state.message}</p>
        ) : null}
      </form>
    </div>
  );
}
