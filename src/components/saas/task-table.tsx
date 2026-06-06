"use client";

import { Fragment, useState, useTransition } from "react";
import { CalendarClock, FolderKanban, Trash2 } from "lucide-react";
import { deleteDelegatedTask } from "@/app/app/tasks/actions";
import { TaskEditButton } from "@/components/saas/task-edit-panel";
import { TaskManagerRequestPanel } from "@/components/saas/task-manager-request-panel";
import type { TaskRow } from "@/components/saas/task-list";
import { TaskReminderStatus } from "@/components/saas/task-reminder-status";
import { TaskUserActions } from "@/components/saas/task-user-actions";
import {
  getTaskDueUrgency,
  taskUrgencyClass,
  type TaskDueUrgency,
} from "@/lib/task-due-urgency";
import {
  TASK_DEPARTMENT_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  assigneeInitials,
  formatTaskAssignedDate,
  formatTaskDueLabel,
} from "@/lib/tasks";

type MemberOption = {
  id: string;
  name: string | null;
  email: string;
};

function tableRowClass(urgency: TaskDueUrgency) {
  if (urgency === "due-overdue") {
    return "row-urgency-overdue";
  }
  if (urgency === "due-today") {
    return "row-urgency-due_today";
  }
  if (urgency === "due-soon") {
    return "row-urgency-due_soon";
  }
  return "";
}

export function TaskTable({
  tasks,
  members = [],
  whatsappConfigured = true,
}: {
  tasks: TaskRow[];
  members?: MemberOption[];
  whatsappConfigured?: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function removeTask(taskId: string) {
    if (!window.confirm("Delete this task?")) {
      return;
    }
    startTransition(() => {
      void deleteDelegatedTask(taskId);
    });
  }

  function toggleRow(taskId: string) {
    setExpandedId((current) => (current === taskId ? null : taskId));
  }

  if (tasks.length === 0) {
    return (
      <div className="ws-empty-state ws-task-empty ws-sf-empty-state">
        <FolderKanban aria-hidden size={28} strokeWidth={1.75} />
        <strong>No tasks match your filters</strong>
        <p>Tap a metric tile above or adjust list filters to see tasks here.</p>
      </div>
    );
  }

  return (
    <article
      className={`hs-table-card ws-task-table-card ws-sf-table-wrap${pending ? " is-updating" : ""}`}
    >
      <div className="hs-table-scroll ws-task-table-scroll">
        <table className="hs-data-table ws-task-table ws-task-table-v2 ws-sf-data-table">
          <thead>
            <tr>
              <th className="ws-task-col-task">Task Name</th>
              <th className="ws-task-col-due">Due Date</th>
              <th className="ws-task-col-status">Status</th>
              <th className="ws-task-col-assignee">Assignee</th>
              <th className="ws-task-table-actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const urgency = getTaskDueUrgency({
                dueAt: task.dueAt,
                status: task.status,
                completedAt: task.completedAt,
              });
              const urgencyClass = taskUrgencyClass(urgency);
              const assigneeName =
                task.assignee.name ?? task.assignee.email.split("@")[0];
              const dueLabel = formatTaskDueLabel(task.dueAt, task.status);
              const expanded = expandedId === task.id;
              const rowClass = [
                tableRowClass(urgency),
                expanded ? "is-expanded" : "",
                task.status === "COMPLETED" ? "is-completed" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <Fragment key={task.id}>
                  <tr
                    className={`ws-task-table-row ${rowClass}`.trim()}
                    onClick={() => toggleRow(task.id)}
                  >
                    <td className="ws-task-table-title ws-task-col-task" data-label="Task">
                      <span className="ws-sf-record-link ws-task-table-title-text">
                        {task.title}
                      </span>
                      {task.openRequest ? (
                        <span className="ws-task-table-flag ws-sf-badge ws-sf-badge-warning">
                          {task.openRequest.label}
                        </span>
                      ) : null}
                      <span className="ws-task-table-meta">
                        {TASK_PRIORITY_LABELS[task.priority]} ·{" "}
                        {TASK_DEPARTMENT_LABELS[task.department]}
                      </span>
                    </td>
                    <td className="ws-task-col-due" data-label="Due Date">
                      <span className={`ws-task-table-due ${urgencyClass}`}>
                        {urgency === "due-overdue" ? (
                          <span className="ws-sf-badge ws-sf-badge-danger ws-sf-overdue-badge">
                            Overdue
                          </span>
                        ) : null}
                        <CalendarClock aria-hidden size={13} />
                        {dueLabel}
                      </span>
                    </td>
                    <td className="ws-task-col-status" data-label="Status">
                      <span
                        className={`ws-task-table-status ws-sf-badge status-${task.status.toLowerCase()}`}
                      >
                        {TASK_STATUS_LABELS[task.status]}
                      </span>
                    </td>
                    <td className="ws-task-col-assignee" data-label="Assignee">
                      <span className="ws-task-table-assignee">
                        <span className="ws-task-avatar ws-task-avatar-sm">
                          {assigneeInitials(task.assignee.name, task.assignee.email)}
                        </span>
                        <span className="ws-task-assignee-name">{assigneeName}</span>
                      </span>
                    </td>
                    <td
                      className="ws-task-table-actions-col"
                      data-label="Actions"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="ws-task-table-actions">
                        {task.canManage ? (
                          <>
                            <TaskEditButton members={members} task={task} />
                            <button
                              aria-label={`Delete ${task.title}`}
                              className="ws-task-action-btn ws-task-action-danger ws-sf-btn-delete"
                              type="button"
                              onClick={() => removeTask(task.id)}
                            >
                              <Trash2 size={15} aria-hidden />
                              Delete
                            </button>
                          </>
                        ) : null}
                        {task.isAssignee && !task.canManage ? (
                          <span className="ws-task-table-hint">Tap row for actions</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  {expanded ? (
                    <tr className="ws-task-table-detail-row">
                      <td colSpan={5}>
                        <div className="ws-task-table-detail">
                          <div className="ws-task-detail-meta">
                            <span>
                              Assigned {formatTaskAssignedDate(task.createdAt)}
                            </span>
                            <span>{TASK_PRIORITY_LABELS[task.priority]} priority</span>
                            <span>{TASK_DEPARTMENT_LABELS[task.department]}</span>
                          </div>
                          <TaskReminderStatus
                            showResend={Boolean(task.canManage)}
                            task={task}
                            whatsappConfigured={whatsappConfigured}
                          />
                          {task.instructions ? (
                            <p className="ws-task-instructions">{task.instructions}</p>
                          ) : null}
                          <TaskManagerRequestPanel task={task} />
                          {task.isAssignee ? <TaskUserActions task={task} /> : null}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}
