"use client";

import { useTransition } from "react";
import { resolveTaskRequest } from "@/app/app/tasks/task-workflow-actions";
import type { TaskRow } from "@/components/saas/task-list";

function toDatetimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function TaskManagerRequestPanel({ task }: { task: TaskRow }) {
  const [pending, startTransition] = useTransition();

  if (!task.canManage || !task.openRequest) {
    return null;
  }

  const request = task.openRequest;

  return (
    <div className="ws-task-manager-request">
      <strong>Assignee request: {request.label}</strong>
      {request.message ? <p>{request.message}</p> : null}
      {request.proposedDueAt ? (
        <p className="ws-task-manager-request-due">
          Proposed due:{" "}
          {request.proposedDueAt.toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })}
        </p>
      ) : null}

      <form
        className="ws-task-manager-request-form"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          startTransition(async () => {
            await resolveTaskRequest(request.id, formData);
          });
        }}
      >
        {request.type === "EXTENSION" ? (
          <label className="ws-field">
            <span>Approved due date</span>
            <input
              defaultValue={
                request.proposedDueAt
                  ? toDatetimeLocalValue(request.proposedDueAt)
                  : undefined
              }
              name="approvedDueAt"
              required
              type="datetime-local"
            />
          </label>
        ) : null}

        <label className="ws-field">
          <span>Reply to assignee (optional)</span>
          <textarea name="resolutionNote" rows={2} placeholder="Your response..." />
        </label>

        <div className="ws-task-actions">
          {request.type === "EXTENSION" ? (
            <>
              <button
                className="ws-task-action-btn ws-task-action-primary"
                disabled={pending}
                name="action"
                type="submit"
                value="approve-extension"
              >
                Approve new date
              </button>
              <button
                className="ws-task-action-btn ws-task-action-danger"
                disabled={pending}
                name="action"
                type="submit"
                value="reject"
              >
                Reject
              </button>
            </>
          ) : (
            <>
              <button
                className="ws-task-action-btn ws-task-action-primary"
                disabled={pending}
                name="action"
                type="submit"
                value="resolve"
              >
                Mark resolved
              </button>
              <button
                className="ws-task-action-btn"
                disabled={pending}
                name="action"
                type="submit"
                value="reject"
              >
                Reject
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
