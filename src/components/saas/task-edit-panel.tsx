"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  FileText,
  Paperclip,
  Pencil,
  UserRound,
  X,
} from "lucide-react";
import { updateDelegatedTask } from "@/app/app/tasks/actions";
import { TaskManagerRequestPanel } from "@/components/saas/task-manager-request-panel";
import {
  getTaskDueUrgency,
  taskUrgencyClass,
  taskUrgencyLabel,
  wasCompletedOnTime,
} from "@/lib/task-due-urgency";
import {
  TASK_DEPARTMENT_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  formatTaskDueLabel,
} from "@/lib/tasks";
import type { TaskRow } from "@/components/saas/task-list";
import type { TaskDepartment, TaskPriority, TaskStatus } from "@prisma/client";

type MemberOption = {
  id: string;
  name: string | null;
  email: string;
};

function toDatetimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function TaskEditPanel({
  task,
  members,
  onClose,
}: {
  task: TaskRow;
  members: MemberOption[];
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const router = useRouter();

  const urgency = getTaskDueUrgency({
    dueAt: task.dueAt,
    status: task.status,
    completedAt: task.completedAt,
  });
  const urgencyClass = taskUrgencyClass(urgency);
  const assigneeName = task.assignee.name ?? task.assignee.email.split("@")[0];
  const assignerName = task.createdBy.name ?? task.createdBy.email.split("@")[0];
  const dueLabel = formatTaskDueLabel(task.dueAt, task.status);
  const onTime =
    task.status === "COMPLETED" &&
    wasCompletedOnTime(task.dueAt, task.completedAt);

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await updateDelegatedTask(task.id, formData);
      setFeedback(result.message);
      if (result.ok) {
        router.refresh();
        onClose();
      }
    });
  }

  return (
    <div className="ws-task-edit-overlay" role="presentation" onClick={onClose}>
      <form
        key={`${task.id}-${task.assignee.id}-${task.status}`}
        className="ws-task-edit-panel"
        role="dialog"
        aria-labelledby={`edit-task-${task.id}`}
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          submit(new FormData(event.currentTarget));
        }}
      >
        <header className="ws-task-edit-head">
          <div>
            <h3 id={`edit-task-${task.id}`}>
              <Pencil size={16} aria-hidden />
              Edit task
            </h3>
            <p className="ws-task-edit-sub">{task.title}</p>
          </div>
          <button className="ws-task-edit-close" type="button" onClick={onClose}>
            <X size={18} />
            <span className="sr-only">Close</span>
          </button>
        </header>

        <div className="ws-task-edit-body">
          <div className="ws-task-edit-summary">
            <span className={`ws-task-status-pill status-${task.status.toLowerCase()}`}>
              {TASK_STATUS_LABELS[task.status]}
            </span>
            <span className={`ws-task-urgency-pill ${urgencyClass}`}>
              {taskUrgencyLabel(urgency)}
            </span>
            <span className="ws-task-edit-meta-chip">
              <UserRound size={13} aria-hidden />
              {assigneeName}
            </span>
            <span className="ws-task-edit-meta-chip">
              From {assignerName}
            </span>
            {task.status === "COMPLETED" ? (
              <span
                className={`ws-task-edit-meta-chip ${onTime ? "is-success" : "is-warning"}`}
              >
                {onTime ? "On time" : "Completed late"}
              </span>
            ) : null}
          </div>

          <TaskManagerRequestPanel task={task} />

          {task.attachments.length > 0 ? (
            <section className="ws-task-edit-proof">
              <h4>
                <Paperclip size={14} aria-hidden />
                Completion proof
              </h4>
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
            </section>
          ) : null}

          <section className="ws-form-section ws-form-section-first">
            <h4 className="ws-form-section-title">Details</h4>
            <div className="form-grid-premium ws-task-edit-form-grid">
              <label className="ws-field form-field-full">
                <span>Title</span>
                <input name="title" required defaultValue={task.title} minLength={3} />
              </label>
              <label className="ws-field form-field-full">
                <span>Instructions</span>
                <textarea
                  name="instructions"
                  rows={3}
                  defaultValue={task.instructions ?? ""}
                  placeholder="What needs to be done?"
                />
              </label>
            </div>
          </section>

          <section className="ws-form-section">
            <h4 className="ws-form-section-title">Assignment</h4>
            <div className="form-grid-premium ws-task-edit-form-grid">
              <label className="ws-field">
                <span>Assignee</span>
                <select name="assigneeUserId" defaultValue={task.assignee.id}>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name ?? member.email}
                    </option>
                  ))}
                </select>
              </label>

              <label className="ws-field">
                <span>Status</span>
                <select name="status" defaultValue={task.status}>
                  {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((status) => (
                    <option key={status} value={status}>
                      {TASK_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="ws-field">
                <span>Priority</span>
                <select name="priority" defaultValue={task.priority}>
                  {(Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map(
                    (priority) => (
                      <option key={priority} value={priority}>
                        {TASK_PRIORITY_LABELS[priority]}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="ws-field">
                <span>Department</span>
                <select name="department" defaultValue={task.department}>
                  {(Object.keys(TASK_DEPARTMENT_LABELS) as TaskDepartment[]).map(
                    (department) => (
                      <option key={department} value={department}>
                        {TASK_DEPARTMENT_LABELS[department]}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>
          </section>

          <section className="ws-form-section">
            <h4 className="ws-form-section-title">Schedule</h4>
            <div className="form-grid-premium ws-task-edit-form-grid">
              <label
                className={`ws-field form-field-full ws-task-due-field ${urgencyClass}`}
              >
                <span className="ws-task-due-label">
                  Due date
                  <span className={`ws-task-due-hint ${urgencyClass}`}>
                    <CalendarClock size={13} aria-hidden />
                    {dueLabel}
                  </span>
                </span>
                <input
                  name="dueAt"
                  type="datetime-local"
                  defaultValue={toDatetimeLocalValue(new Date(task.dueAt))}
                  required
                />
              </label>

              <label className="ws-field form-field-full">
                <span>Category</span>
                <input
                  name="category"
                  defaultValue={task.category ?? ""}
                  maxLength={80}
                  placeholder="Optional tag, e.g. Follow-up"
                />
              </label>
            </div>
          </section>

          {feedback && !pending ? (
            <p className="ws-form-error">{feedback}</p>
          ) : null}
        </div>

        <footer className="ws-task-edit-actions">
          <button className="btn-ghost" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-cta" disabled={pending} type="submit">
            {pending ? "Saving..." : "Save changes"}
          </button>
        </footer>
      </form>
    </div>
  );
}

export function TaskEditButton({
  task,
  members,
}: {
  task: TaskRow;
  members: MemberOption[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        className="ws-task-action-btn"
        type="button"
        onClick={() => setOpen(true)}
      >
        <Pencil size={15} aria-hidden />
        Edit
      </button>
      {open ? (
        <TaskEditPanel
          members={members}
          task={task}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
