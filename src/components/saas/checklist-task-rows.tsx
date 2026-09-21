"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Upload, X } from "lucide-react";
import {
  completeChecklistOccurrenceAction,
  deleteChecklistTemplateAction,
  updateChecklistOccurrenceAction,
  updateChecklistTemplateAction,
} from "@/app/app/checklists/actions";
import { fmsInitialState as checklistInitialState } from "@/lib/fms-action-state";
import { CHECKLIST_FREQUENCY_LABELS } from "@/lib/checklists/constants";
import { AiVoiceTextarea } from "@/components/saas/ai-voice-textarea";
import type { ChecklistTaskRow } from "@/lib/checklists/queries";

type Member = { id: string; name: string | null; email: string };

function formatDue(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ownerLabel(name: string | null, email: string) {
  return name ?? email.split("@")[0];
}

function TickComplete({
  occurrenceId,
  disabled,
}: {
  occurrenceId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    completeChecklistOccurrenceAction,
    checklistInitialState,
  );

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <form action={formAction} className="ws-cl-tick-form">
      <input name="occurrenceId" type="hidden" value={occurrenceId} />
      <label className="ws-cl-tick">
        <input
          aria-label="Mark done"
          disabled={disabled || pending}
          type="checkbox"
          onChange={(event) => {
            if (event.currentTarget.checked) {
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
      </label>
      {state.message && !state.ok ? (
        <span className="ws-form-error">{state.message}</span>
      ) : null}
    </form>
  );
}

function UpdateDialog({
  task,
  onClose,
}: {
  task: ChecklistTaskRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateChecklistOccurrenceAction,
    checklistInitialState,
  );

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      onClose();
    }
  }, [state.ok, onClose, router]);

  return (
    <div className="ws-cl-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ws-cl-dialog"
        role="dialog"
        aria-labelledby={`cl-update-${task.id}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h3 id={`cl-update-${task.id}`}>Update {task.template.title}</h3>
          <button type="button" className="btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>
        <form action={formAction} className="ws-cl-dialog-form">
          <input name="occurrenceId" type="hidden" value={task.id} />
          <AiVoiceTextarea
            defaultValue={task.notes ?? ""}
            name="notes"
            placeholder="Add notes or proof remarks"
            rows={4}
          />
          <label className="ws-cl-file">
            <Upload size={14} aria-hidden />
            <span>Upload proof if any</span>
            <input name="proof" type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" />
          </label>
          {task.proofFileName ? (
            <a href={`/api/checklists/proof/${task.id}`} target="_blank" rel="noreferrer">
              Current proof: {task.proofFileName}
            </a>
          ) : null}
          {state.message && !state.ok ? (
            <p className="ws-form-error">{state.message}</p>
          ) : null}
          <div className="ws-cl-dialog-actions">
            <button
              className="btn-secondary"
              disabled={pending}
              name="intent"
              type="submit"
              value="update"
            >
              {pending ? "Saving…" : "Save update"}
            </button>
            <button
              className="btn-primary ws-sf-btn-primary"
              disabled={pending}
              name="intent"
              type="submit"
              value="done"
            >
              Save and mark done
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditDialog({
  task,
  members,
  onClose,
}: {
  task: ChecklistTaskRow;
  members: Member[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateChecklistTemplateAction,
    checklistInitialState,
  );

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      onClose();
    }
  }, [state.ok, onClose, router]);

  return (
    <div className="ws-cl-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ws-cl-dialog"
        role="dialog"
        aria-labelledby={`cl-edit-${task.template.id}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h3 id={`cl-edit-${task.template.id}`}>Edit checklist</h3>
          <button type="button" className="btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>
        <form action={formAction} className="ws-cl-dialog-form">
          <input name="templateId" type="hidden" value={task.template.id} />
          <label>
            Title
            <input defaultValue={task.template.title} name="title" required />
          </label>
          <label>
            How / instructions
            <textarea
              defaultValue={task.template.instructions ?? ""}
              name="instructions"
              rows={4}
            />
          </label>
          <label>
            Doer
            <select defaultValue={task.assigneeUserId} name="assigneeUserId">
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name ?? member.email}
                </option>
              ))}
            </select>
          </label>
          {state.message && !state.ok ? (
            <p className="ws-form-error">{state.message}</p>
          ) : null}
          <div className="ws-cl-dialog-actions">
            <button className="btn-primary ws-sf-btn-primary" disabled={pending} type="submit">
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteForm({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    deleteChecklistTemplateAction,
    checklistInitialState,
  );

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm("Delete this checklist schedule?")) {
          event.preventDefault();
        }
      }}
    >
      <input name="templateId" type="hidden" value={templateId} />
      <button
        className="btn-ghost btn-sm ws-cl-danger"
        disabled={pending}
        type="submit"
        title="Delete"
      >
        <Trash2 size={14} aria-hidden />
        Delete
      </button>
      {state.message && !state.ok ? (
        <span className="ws-form-error">{state.message}</span>
      ) : null}
    </form>
  );
}

export function ChecklistTaskRows({
  tasks,
  currentUserId,
  isAdmin,
  members,
}: {
  tasks: ChecklistTaskRow[];
  currentUserId: string;
  isAdmin: boolean;
  members: Member[];
}) {
  const [updateId, setUpdateId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const updateTask = tasks.find((row) => row.id === updateId) ?? null;
  const editTask = tasks.find((row) => row.id === editId) ?? null;

  if (tasks.length === 0) {
    return (
      <div className="ws-empty-state">
        <p>No open Check List tasks right now.</p>
      </div>
    );
  }

  return (
    <>
      <div className="ws-sf-table-wrap ws-cl-task-wrap">
        <table className="ws-fms-data-table ws-sf-data-table ws-cl-task-table">
          <thead>
            <tr>
              <th className="ws-cl-tick-col">Done</th>
              <th>Check List task</th>
              <th>Doer</th>
              <th>Due</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const canUpdate = isAdmin || task.assigneeUserId === currentUserId;
              const overdue = task.status === "OVERDUE";
              return (
                <tr key={task.id} className={overdue ? "is-overdue" : undefined}>
                  <td data-label="Done" className="ws-cl-tick-col">
                    <TickComplete disabled={!canUpdate} occurrenceId={task.id} />
                  </td>
                  <td data-label="Task">
                    <strong>{task.template.title}</strong>
                    <p className="ws-fms-muted">
                      {CHECKLIST_FREQUENCY_LABELS[
                        task.template.frequency as keyof typeof CHECKLIST_FREQUENCY_LABELS
                      ] ?? task.template.frequency}
                      {task.notes ? ` · ${task.notes}` : ""}
                    </p>
                  </td>
                  <td data-label="Doer">
                    {ownerLabel(task.assignee.name, task.assignee.email)}
                  </td>
                  <td data-label="Due">{formatDue(task.plannedAt)}</td>
                  <td data-label="Status">
                    <span className={`ws-team-checklist-status${overdue ? " is-overdue" : ""}`}>
                      {task.status}
                    </span>
                  </td>
                  <td data-label="Actions">
                    <div className="ws-cl-row-actions">
                      {canUpdate ? (
                        <button
                          className="btn-secondary btn-sm"
                          type="button"
                          onClick={() => setUpdateId(task.id)}
                        >
                          Update
                        </button>
                      ) : null}
                      {isAdmin ? (
                        <>
                          <button
                            className="btn-ghost btn-sm"
                            type="button"
                            onClick={() => setEditId(task.id)}
                          >
                            <Pencil size={14} aria-hidden />
                            Edit
                          </button>
                          <DeleteForm templateId={task.template.id} />
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {updateTask ? (
        <UpdateDialog task={updateTask} onClose={() => setUpdateId(null)} />
      ) : null}
      {editTask && isAdmin ? (
        <EditDialog
          members={members}
          task={editTask}
          onClose={() => setEditId(null)}
        />
      ) : null}
    </>
  );
}
