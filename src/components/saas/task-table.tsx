"use client";

import { Fragment, useState, useTransition } from "react";
import {
  CalendarClock,
  ChevronDown,
  FolderKanban,
  Trash2,
} from "lucide-react";
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
}: {
  tasks: TaskRow[];
  members?: MemberOption[];
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
      <div className="ws-empty-state ws-task-empty">
        <FolderKanban aria-hidden size={28} strokeWidth={1.75} />
        <strong>No tasks match your filters</strong>
        <p>Tap a stat card above or adjust filters to see tasks here.</p>
      </div>
    );
  }

  return (
    <article
      className={`hs-table-card ws-task-table-card${pending ? " is-updating" : ""}`}
    >
      <div className="hs-table-scroll">
        <table className="hs-data-table ws-task-table">
          <thead>
            <tr>
              <th aria-hidden className="ws-task-table-expand-col" />
              <th>Task</th>
              <th>Assigned</th>
              <th>Status</th>
              <th>Assignee</th>
              <th>Due</th>
              <th>Priority</th>
              <th>Dept</th>
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
                    <td className="ws-task-table-expand-col">
                      <ChevronDown
                        aria-hidden
                        className={`ws-task-table-chevron${expanded ? " is-open" : ""}`}
                        size={16}
                      />
                    </td>
                    <td className="cell-strong ws-task-table-title">
                      <span>{task.title}</span>
                      {task.openRequest ? (
                        <span className="ws-task-table-flag">{task.openRequest.label}</span>
                      ) : null}
                      {task.instructions ? (
                        <span className="ws-task-table-sub">
                          {task.instructions.slice(0, 80)}
                          {task.instructions.length > 80 ? "..." : ""}
                        </span>
                      ) : null}
                    </td>
                    <td className="ws-task-table-assigned">
                      {formatTaskAssignedDate(task.createdAt)}
                    </td>
                    <td>
                      <span
                        className={`ws-task-table-status status-${task.status.toLowerCase()}`}
                      >
                        {TASK_STATUS_LABELS[task.status].toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className="ws-task-table-assignee">
                        <span className="ws-task-avatar ws-task-avatar-sm">
                          {assigneeInitials(task.assignee.name, task.assignee.email)}
                        </span>
                        {assigneeName}
                      </span>
                    </td>
                    <td>
                      <span className={`ws-task-table-due ${urgencyClass}`}>
                        <CalendarClock aria-hidden size={13} />
                        {dueLabel}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`ws-priority priority-${task.priority.toLowerCase()}`}
                      >
                        {TASK_PRIORITY_LABELS[task.priority]}
                      </span>
                    </td>
                    <td className="ws-task-table-dept">
                      {TASK_DEPARTMENT_LABELS[task.department]}
                    </td>
                    <td
                      className="ws-task-table-actions-col"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="ws-task-table-actions">
                        {task.canManage ? (
                          <>
                            <TaskEditButton members={members} task={task} />
                            <button
                              aria-label={`Delete ${task.title}`}
                              className="ws-task-action-btn ws-task-action-danger ws-task-table-icon-btn"
                              type="button"
                              onClick={() => removeTask(task.id)}
                            >
                              <Trash2 size={15} aria-hidden />
                            </button>
                          </>
                        ) : (
                          <span className="ws-task-table-id">
                            {task.id.slice(0, 8)}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded ? (
                    <tr className="ws-task-table-detail-row">
                      <td colSpan={9}>
                        <div className="ws-task-table-detail">
                          <TaskReminderStatus
                            showResend={Boolean(task.canManage)}
                            task={task}
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
