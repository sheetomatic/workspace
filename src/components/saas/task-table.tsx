"use client";

import { Fragment, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, ChevronRight, FolderKanban, Trash2 } from "lucide-react";
import { deleteDelegatedTask, deleteDelegatedTasks } from "@/app/app/tasks/actions";
import { TaskEditButton, TaskEditPanel } from "@/components/saas/task-edit-panel";
import { TaskManagerRequestPanel } from "@/components/saas/task-manager-request-panel";
import { TaskVerificationPanel } from "@/components/saas/task-verification-panel";
import type { TaskRow } from "@/components/saas/task-list";
import { TaskReminderStatus } from "@/components/saas/task-reminder-status";
import { TaskUserActions } from "@/components/saas/task-user-actions";
import {
  type TaskDueUrgency,
  taskUrgencyClass,
} from "@/lib/task-due-urgency";
import {
  TASK_DEPARTMENT_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  assigneeInitials,
  formatTaskAssignedDate,
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
  canBulkDelete = false,
}: {
  tasks: TaskRow[];
  members?: MemberOption[];
  whatsappConfigured?: boolean;
  canBulkDelete?: boolean;
}) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const visibleIds = tasks.map((task) => task.id);
  const visibleKey = visibleIds.join(",");
  const selectedCount = visibleIds.filter((id) => selected.has(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && selectedCount === visibleIds.length;

  useEffect(() => {
    setSelected(new Set());
  }, [visibleKey]);

  function removeTask(taskId: string) {
    if (!window.confirm("Delete this task?")) {
      return;
    }
    startTransition(() => {
      void deleteDelegatedTask(taskId);
    });
  }

  function toggleSelected(taskId: string) {
    setBulkMessage(null);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected(allVisibleSelected ? new Set() : new Set(visibleIds));
  }

  function removeSelected() {
    const ids = visibleIds.filter((id) => selected.has(id));
    if (ids.length === 0) return;
    const confirmed = window.confirm(
      `Delete ${ids.length} selected task${ids.length === 1 ? "" : "s"}? This cannot be undone.`,
    );
    if (!confirmed) return;
    setBulkMessage(null);
    startTransition(async () => {
      const result = await deleteDelegatedTasks(ids);
      setBulkMessage(result.message);
      if (result.ok) {
        setSelected(new Set());
        router.refresh();
      }
    });
  }

  function toggleRow(taskId: string) {
    setExpandedId((current) => (current === taskId ? null : taskId));
  }

  function handleRowClick(task: TaskRow) {
    if (task.canManage) {
      setEditingTask(task);
      return;
    }
    toggleRow(task.id);
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

  const columnCount = canBulkDelete ? 7 : 6;

  return (
    <>
    {canBulkDelete ? (
      <div className="ws-task-select-bar">
        <label className="ws-task-select-bar__all">
          <input
            ref={(node) => {
              if (node) {
                node.indeterminate = selectedCount > 0 && !allVisibleSelected;
              }
            }}
            type="checkbox"
            aria-label="Select all tasks on this page"
            checked={allVisibleSelected}
            onChange={toggleAllVisible}
          />
          {selectedCount > 0 ? `${selectedCount} selected` : "Select page"}
        </label>
        {selectedCount > 0 ? (
          <button
            type="button"
            className="ws-btn-danger ws-btn-small"
            disabled={pending}
            onClick={removeSelected}
          >
            <Trash2 aria-hidden size={14} strokeWidth={1.75} />
            {pending ? "Deleting…" : "Delete selected"}
          </button>
        ) : null}
        {bulkMessage ? (
          <span className="ws-task-select-bar__note" role="status">
            {bulkMessage}
          </span>
        ) : null}
      </div>
    ) : null}
    <article
      className={`hs-table-card ws-task-table-card ws-sf-table-wrap${canBulkDelete ? " is-selectable" : ""}${pending ? " is-updating" : ""}`}
    >
      <div className="hs-table-scroll ws-task-table-scroll">
        <table className="hs-data-table ws-task-table ws-task-table-v2 ws-sf-data-table">
          <thead>
            <tr>
              {canBulkDelete ? (
                <th className="ws-task-select-col">
                  <input
                    ref={(node) => {
                      if (node) {
                        node.indeterminate = selectedCount > 0 && !allVisibleSelected;
                      }
                    }}
                    type="checkbox"
                    aria-label="Select all tasks on this page"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                  />
                </th>
              ) : null}
              <th className="ws-task-table-expand-col" aria-hidden />
              <th className="ws-task-col-task">Task Name</th>
              <th className="ws-task-col-due">Due Date</th>
              <th className="ws-task-col-status">Status</th>
              <th className="ws-task-col-assignee">Assignee</th>
              <th className="ws-task-table-actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const urgency = task.urgency;
              const urgencyClass = taskUrgencyClass(urgency);
              const assigneeName =
                task.assignee.name ?? task.assignee.email.split("@")[0];
              const dueLabel = task.dueLabel;
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
                    role="button"
                    tabIndex={0}
                    aria-label={
                      task.canManage
                        ? `Edit task ${task.title}`
                        : `Open task ${task.title}`
                    }
                    onClick={() => handleRowClick(task)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleRowClick(task);
                      }
                    }}
                  >
                    {canBulkDelete ? (
                      <td
                        className="ws-task-select-col"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Select ${task.title}`}
                          checked={selected.has(task.id)}
                          onChange={() => toggleSelected(task.id)}
                        />
                      </td>
                    ) : null}
                    <td
                      className="ws-task-table-expand-col"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleRow(task.id);
                      }}
                    >
                      <span
                        className={`ws-task-table-chevron${expanded ? " is-open" : ""}`}
                        aria-hidden
                      >
                        <ChevronRight size={16} />
                      </span>
                    </td>
                    <td className="ws-task-table-title ws-task-col-task" data-label="Task">
                      <span className="ws-task-table-title-text">
                        {task.title}
                      </span>
                      {task.openRequest ? (
                        <span className="ws-task-table-flag ws-sf-badge ws-sf-badge-warning">
                          {task.openRequest.label}
                        </span>
                      ) : task.status === "AWAITING_VERIFICATION" ? (
                        <span className="ws-task-table-flag ws-sf-badge ws-sf-badge-info">
                          Proof submitted
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
                          <span className="ws-task-table-hint">Tap row to act</span>
                        ) : task.canManage ? (
                          <span className="ws-task-table-hint">Tap row to edit</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  {expanded ? (
                    <tr className="ws-task-table-detail-row">
                      <td colSpan={columnCount}>
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
                          <TaskVerificationPanel task={task} />
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
    {editingTask ? (
      <TaskEditPanel
        members={members}
        task={editingTask}
        onClose={() => setEditingTask(null)}
      />
    ) : null}
    </>
  );
}
