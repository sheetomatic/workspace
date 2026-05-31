"use client";

import { useEffect, useTransition } from "react";
import {
  CalendarClock,
  CheckCircle2,
  FolderKanban,
  Mail,
  MessageCircle,
  Play,
  Repeat2,
  Trash2,
  UserRound,
} from "lucide-react";
import { deleteDelegatedTask, updateTaskStatus } from "@/app/app/tasks/actions";
import { TaskEditButton } from "@/components/saas/task-edit-panel";
import { formatRecurrenceSummary } from "@/lib/task-schedule";
import {
  TASK_DEPARTMENT_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  assigneeInitials,
  formatTaskDueLabel,
  isTaskOverdue,
} from "@/lib/tasks";
import type { TaskFrequency, TaskPriority, TaskStatus } from "@prisma/client";

export type TaskRow = {
  id: string;
  title: string;
  instructions: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  department: keyof typeof TASK_DEPARTMENT_LABELS;
  category: string | null;
  frequency: TaskFrequency;
  recurrenceWeeklyDays: string | null;
  recurrenceMonthDay: number | null;
  isRecurring: boolean;
  occurrenceNumber: number;
  remindViaEmail: boolean;
  remindViaWhatsApp: boolean;
  emailAssignmentSentAt: Date | null;
  whatsappAssignmentSentAt: Date | null;
  emailReminderSentAt: Date | null;
  whatsappReminderSentAt: Date | null;
  nextOccurrenceAt: Date | null;
  dueAt: Date;
  assignee: { id: string; name: string | null; email: string };
  createdBy: { id: string; name: string | null; email: string };
  canAct: boolean;
  canManage?: boolean;
};

type MemberOption = {
  id: string;
  name: string | null;
  email: string;
};

export function TaskList({
  tasks,
  members = [],
}: {
  tasks: TaskRow[];
  members?: MemberOption[];
}) {
  const [pending, startTransition] = useTransition();

  function removeTask(taskId: string) {
    if (!window.confirm("Delete this task?")) {
      return;
    }
    startTransition(() => {
      void deleteDelegatedTask(taskId);
    });
  }

  function setStatus(taskId: string, status: TaskStatus) {
    startTransition(() => {
      void updateTaskStatus(taskId, status);
    });
  }

  if (tasks.length === 0) {
    return (
      <div className="ws-empty-state ws-task-empty">
        <FolderKanban aria-hidden size={28} strokeWidth={1.75} />
        <strong>No tasks match your filters</strong>
        <p>Assign work with owner, due date, category, and reminders.</p>
      </div>
    );
  }

  return (
    <ul className={`ws-task-list ${pending ? "is-updating" : ""}`}>
      {tasks.map((task) => {
        const overdue = isTaskOverdue(task.dueAt, task.status);
        const assigneeName =
          task.assignee.name ?? task.assignee.email.split("@")[0];
        const dueLabel = formatTaskDueLabel(task.dueAt, task.status);

        return (
          <li
            className={`ws-task-card status-${task.status.toLowerCase()}${overdue ? " is-overdue" : ""}`}
            key={task.id}
          >
            <div
              aria-hidden
              className={`ws-task-status-rail status-${task.status.toLowerCase()}`}
            />

            <div className="ws-task-card-body">
              <div className="ws-task-card-top">
                <div className="ws-task-title-block">
                  <div className="ws-task-chip-row">
                    <span
                      className={`ws-task-status-pill status-${task.status.toLowerCase()}`}
                    >
                      {TASK_STATUS_LABELS[task.status]}
                    </span>
                    <span
                      className={`ws-priority priority-${task.priority.toLowerCase()}`}
                    >
                      {TASK_PRIORITY_LABELS[task.priority]}
                    </span>
                    {task.category ? (
                      <span className="ws-task-category-chip">{task.category}</span>
                    ) : null}
                    {overdue ? (
                      <span className="ws-task-overdue-tag">Overdue</span>
                    ) : null}
                  </div>

                  <h3>{task.title}</h3>
                  {task.instructions ? (
                    <p className="ws-task-instructions">{task.instructions}</p>
                  ) : null}
                </div>

                <div className="ws-task-assignee">
                  <span className="ws-task-avatar" title={assigneeName}>
                    {assigneeInitials(task.assignee.name, task.assignee.email)}
                  </span>
                  <div className="ws-task-assignee-text">
                    <span className="ws-task-assignee-label">Owner</span>
                    <strong>{assigneeName}</strong>
                  </div>
                </div>
              </div>

              <div className="ws-task-meta-inline">
                <span className={overdue ? "is-overdue" : ""}>
                  <CalendarClock size={14} aria-hidden />
                  {dueLabel}
                </span>
                <span>
                  <UserRound size={14} aria-hidden />
                  {TASK_DEPARTMENT_LABELS[task.department]}
                </span>
                {task.isRecurring ? (
                  <span className="ws-task-meta-chip">
                    <Repeat2 size={13} aria-hidden />
                    {formatRecurrenceSummary(
                      task.frequency,
                      task.recurrenceWeeklyDays,
                      task.recurrenceMonthDay,
                    )}
                    {task.occurrenceNumber > 1 ? ` #${task.occurrenceNumber}` : ""}
                  </span>
                ) : null}
                {task.remindViaEmail ? (
                  <span
                    className={`ws-task-meta-chip${task.emailAssignmentSentAt ? " is-sent" : ""}`}
                  >
                    <Mail size={13} aria-hidden />
                    Email{task.emailAssignmentSentAt ? " sent" : ""}
                  </span>
                ) : null}
                {task.remindViaWhatsApp ? (
                  <span
                    className={`ws-task-meta-chip${task.whatsappAssignmentSentAt ? " is-sent" : ""}`}
                  >
                    <MessageCircle size={13} aria-hidden />
                    WhatsApp{task.whatsappAssignmentSentAt ? " sent" : ""}
                  </span>
                ) : null}
                {task.emailReminderSentAt ? (
                  <span className="ws-task-meta-chip is-sent">
                    Due email sent
                  </span>
                ) : null}
              </div>

              {task.status !== "COMPLETED" && task.canAct ? (
                <div className="ws-task-actions">
                  {task.status === "PENDING" ? (
                    <button
                      className="ws-task-action-btn"
                      type="button"
                      onClick={() => setStatus(task.id, "IN_PROGRESS")}
                    >
                      <Play size={15} aria-hidden />
                      Start
                    </button>
                  ) : null}
                  <button
                    className="ws-task-action-btn ws-task-action-primary"
                    type="button"
                    onClick={() => setStatus(task.id, "COMPLETED")}
                  >
                    <CheckCircle2 size={15} aria-hidden />
                    Complete
                  </button>
                  {task.canManage ? (
                    <>
                      <TaskEditButton members={members} task={task} />
                      <button
                        className="ws-task-action-btn ws-task-action-danger"
                        type="button"
                        onClick={() => removeTask(task.id)}
                      >
                        <Trash2 size={15} aria-hidden />
                        Delete
                      </button>
                    </>
                  ) : null}
                  {task.isRecurring ? (
                    <p className="ws-task-recurring-hint">
                      Completing schedules the next occurrence.
                    </p>
                  ) : null}
                </div>
              ) : task.status === "COMPLETED" ? (
                <p className="ws-task-done">
                  <CheckCircle2 size={14} aria-hidden />
                  Completed
                </p>
              ) : (
                <p className="ws-task-readonly">View only</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
