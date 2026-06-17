"use client";

import { useTransition } from "react";
import { FileText } from "lucide-react";
import {
  rejectTaskProof,
  verifyTaskProof,
} from "@/app/app/tasks/task-workflow-actions";
import type { TaskRow } from "@/components/saas/task-list";

export function TaskVerificationPanel({ task }: { task: TaskRow }) {
  const [pending, startTransition] = useTransition();

  if (!task.canVerify || task.status !== "AWAITING_VERIFICATION") {
    return null;
  }

  return (
    <div className="ws-task-verification-panel">
      <strong>Proof submitted — verify to complete</strong>
      <p className="ws-task-verification-lead">
        Review the assignee&apos;s proof files. Verify when the work is acceptable,
        or send it back with feedback.
      </p>

      {task.proofSubmittedAt ? (
        <p className="ws-fms-muted ws-task-verification-meta">
          Submitted{" "}
          {task.proofSubmittedAt.toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })}
        </p>
      ) : null}

      {task.attachments.length > 0 ? (
        <ul className="ws-task-proof-list">
          {task.attachments.map((file) => (
            <li key={file.id}>
              <FileText size={14} aria-hidden />
              <a href={`/api/tasks/attachments/${file.id}`} target="_blank" rel="noreferrer">
                {file.fileName}
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      <form
        className="ws-task-manager-request-form"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const action = formData.get("action")?.toString();
          startTransition(async () => {
            if (action === "reject") {
              await rejectTaskProof(task.id, formData);
              return;
            }
            await verifyTaskProof(task.id, formData);
          });
        }}
      >
        <label className="ws-field">
          <span>Verification note (optional for approve, required to send back)</span>
          <textarea
            name="verificationNote"
            rows={2}
            placeholder="What was checked, or what needs to be fixed"
          />
        </label>

        <div className="ws-task-actions">
          <button
            className="ws-task-action-btn ws-task-action-primary"
            disabled={pending}
            name="action"
            type="submit"
            value="verify"
          >
            Verify & mark complete
          </button>
          <button
            className="ws-task-action-btn ws-task-action-danger"
            disabled={pending}
            name="action"
            type="submit"
            value="reject"
          >
            Send back for rework
          </button>
        </div>
      </form>
    </div>
  );
}
