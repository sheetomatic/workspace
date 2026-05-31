"use client";

import { useEffect, useState, useTransition } from "react";
import { Pencil, X } from "lucide-react";
import { updateDelegatedTask } from "@/app/app/tasks/actions";
import {
  TASK_DEPARTMENT_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
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

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await updateDelegatedTask(task.id, formData);
      setFeedback(result.message);
      if (result.ok) {
        onClose();
      }
    });
  }

  return (
    <div className="ws-task-edit-overlay" role="presentation" onClick={onClose}>
      <form
        className="ws-task-edit-panel"
        role="dialog"
        aria-labelledby={`edit-task-${task.id}`}
        onClick={(event) => event.stopPropagation()}
        action={submit}
      >
        <header className="ws-task-edit-head">
          <h3 id={`edit-task-${task.id}`}>
            <Pencil size={16} aria-hidden />
            Edit task
          </h3>
          <button className="ws-task-edit-close" type="button" onClick={onClose}>
            <X size={18} />
            <span className="sr-only">Close</span>
          </button>
        </header>

        <label className="ws-field">
          <span>Title</span>
          <input name="title" required defaultValue={task.title} minLength={3} />
        </label>

        <label className="ws-field">
          <span>Instructions</span>
          <textarea
            name="instructions"
            rows={3}
            defaultValue={task.instructions ?? ""}
          />
        </label>

        <div className="ws-task-edit-grid">
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

          <label className="ws-field ws-task-edit-span">
            <span>Due date</span>
            <input
              name="dueAt"
              type="datetime-local"
              defaultValue={toDatetimeLocalValue(new Date(task.dueAt))}
              required
            />
          </label>

          <label className="ws-field ws-task-edit-span">
            <span>Category</span>
            <input name="category" defaultValue={task.category ?? ""} maxLength={80} />
          </label>
        </div>

        {feedback && !pending ? (
          <p className="saas-form-message error">{feedback}</p>
        ) : null}

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
