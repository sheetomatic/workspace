"use client";

import { useTransition } from "react";
import {
  CalendarClock,
  CheckCircle2,
  FileText,
  FolderKanban,
  Mail,
  MessageCircle,
  Paperclip,
  Repeat2,
  Trash2,
  UserRound,
} from "lucide-react";
import { deleteDelegatedTask } from "@/app/app/tasks/actions";
import { TaskEditButton } from "@/components/saas/task-edit-panel";
import { TaskManagerRequestPanel } from "@/components/saas/task-manager-request-panel";
import { TaskVerificationPanel } from "@/components/saas/task-verification-panel";
import { TaskUserActions } from "@/components/saas/task-user-actions";
import { formatRecurrenceSummary } from "@/lib/task-schedule";
import {
  taskUrgencyClass,
  taskUrgencyLabel,
  wasCompletedOnTime,
} from "@/lib/task-due-urgency";
import {
  TASK_DEPARTMENT_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  assigneeInitials,
} from "@/lib/tasks";
import type { TaskFrequency, TaskPriority, TaskRequestType, TaskStatus } from "@prisma/client";

export type TaskOpenRequest = {
  id: string;
  type: TaskRequestType;
  label: string;
  message: string | null;
  proposedDueAt: Date | null;
};

export type TaskAttachmentRow = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: Date;
};

import type { TaskDueUrgency } from "@/lib/task-due-urgency";

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
  createdAt: Date;
  completedAt: Date | null;
  proofSubmittedAt?: Date | null;
  assignee: {
    id: string;
    name: string | null;
    email: string;
    phone?: string | null;
  };
  createdBy: { id: string; name: string | null; email: string };
  attachments: TaskAttachmentRow[];
  openRequest: TaskOpenRequest | null;
  canAct: boolean;
  canManage?: boolean;
  canVerify?: boolean;
  isAssignee?: boolean;
  dueLabel: string;
  urgency: TaskDueUrgency;
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
        const urgency = task.urgency;
        const urgencyClass = taskUrgencyClass(urgency);
        const assigneeName =
          task.assignee.name ?? task.assignee.email.split("@")[0];
        const assignerName =
          task.createdBy.name ?? task.createdBy.email.split("@")[0];
        const dueLabel = task.dueLabel;
        const onTime =
          task.status === "COMPLETED" &&
          wasCompletedOnTime(task.dueAt, task.completedAt);

        return (
          <li
            className={`ws-task-card status-${task.status.toLowerCase()} ${urgencyClass}`}
            key={task.id}
          >
            <div
              aria-hidden
              className={`ws-task-status-rail ${urgencyClass}`}
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
                    <span className={`ws-task-urgency-pill ${urgencyClass}`}>
                      {taskUrgencyLabel(urgency)}
                    </span>
                    <span
                      className={`ws-priority priority-${task.priority.toLowerCase()}`}
                    >
                      {TASK_PRIORITY_LABELS[task.priority]}
                    </span>
                    {task.category ? (
                      <span className="ws-task-category-chip">{task.category}</span>
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
                    <span className="ws-task-assignee-label">Assignee</span>
                    <strong>{assigneeName}</strong>
                    <span className="ws-task-assigner-label">
                      From {assignerName}
                    </span>
                  </div>
                </div>
              </div>

              <div className="ws-task-meta-inline">
                <span className={urgencyClass}>
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
                    className={`ws-task-meta-chip${
                      task.whatsappAssignmentSentAt ? " is-sent" : " is-warning"
                    }`}
                  >
                    <MessageCircle size={13} aria-hidden />
                    {task.whatsappAssignmentSentAt
                      ? "WhatsApp sent"
                      : "WhatsApp not sent"}
                  </span>
                ) : null}
              </div>

              {task.attachments.length > 0 ? (
                <div className="ws-task-proof-list">
                  <span className="ws-task-proof-label">
                    <Paperclip size={14} aria-hidden />
                    Proof uploaded
                  </span>
                  <ul>
                    {task.attachments.map((file) => (
                      <li key={file.id}>
                        <a
                          href={`/api/tasks/attachments/${file.id}`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <FileText size={14} aria-hidden />
                          {file.fileName}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <TaskManagerRequestPanel task={task} />
              <TaskVerificationPanel task={task} />

              {task.isAssignee ? <TaskUserActions task={task} /> : null}

              {task.canManage ? (
                <div className="ws-task-actions ws-task-manager-actions">
                  <TaskEditButton members={members} task={task} />
                  <button
                    className="ws-task-action-btn ws-task-action-danger"
                    type="button"
                    onClick={() => removeTask(task.id)}
                  >
                    <Trash2 size={15} aria-hidden />
                    Delete
                  </button>
                </div>
              ) : null}

              {task.status === "COMPLETED" ? (
                <p className={`ws-task-done ${onTime ? "is-on-time" : "is-late"}`}>
                  <CheckCircle2 size={14} aria-hidden />
                  {onTime ? "Completed on time" : "Completed after due date"}
                  {task.completedAt
                    ? ` · ${task.completedAt.toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}`
                    : ""}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
