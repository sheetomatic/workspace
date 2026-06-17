"use client";

import { useEffect, useRef, useState, useTransition, type DragEvent } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  CalendarPlus,
  CheckCircle2,
  FileText,
  FileUp,
  HelpCircle,
  RotateCcw,
  X,
} from "lucide-react";
import {
  cancelAssigneeRequest,
  completeTaskWithProof,
  submitTaskExtensionRequest,
  submitTaskHelpRequest,
  submitTaskRevisionRequest,
} from "@/app/app/tasks/task-workflow-actions";
import type { TaskRow } from "@/components/saas/task-list";
import {
  TASK_PROOF_MAX_FILES,
  formatTaskProofMaxSize,
} from "@/lib/task-attachments";
import {
  getTaskDueUrgency,
  taskUrgencyClass,
  taskUrgencyLabel,
} from "@/lib/task-due-urgency";

type DialogMode =
  | null
  | "complete"
  | "revision"
  | "extension"
  | "help";

function defaultExtensionValue(dueAt: Date) {
  const next = new Date(Math.max(dueAt.getTime(), Date.now()) + 86_400_000);
  next.setHours(17, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}T${pad(next.getHours())}:${pad(next.getMinutes())}`;
}

function formatProofFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function syncProofFileInput(input: HTMLInputElement | null, files: File[]) {
  if (!input) {
    return;
  }
  const transfer = new DataTransfer();
  for (const file of files) {
    transfer.items.add(file);
  }
  input.files = transfer.files;
}

function TaskProofFileUpload({ maxFiles }: { maxFiles: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);

  function applyFiles(incoming: File[]) {
    const next = incoming.slice(0, maxFiles);
    setFiles(next);
    syncProofFileInput(inputRef.current, next);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    applyFiles(Array.from(event.dataTransfer.files ?? []));
  }

  return (
    <div className="ws-field ws-file-upload-field form-field-full">
      <span>Proof files</span>
      <div
        className={`ws-file-upload-zone${dragOver ? " is-dragover" : ""}${files.length >= maxFiles ? " is-full" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragOver(false);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.txt,application/pdf,image/*"
          className="ws-file-upload-input"
          disabled={files.length >= maxFiles}
          multiple
          name="proofFiles"
          required={files.length === 0}
          type="file"
          onChange={(event) => applyFiles(Array.from(event.target.files ?? []))}
        />
        <FileUp size={22} aria-hidden />
        <p className="ws-file-upload-title">
          {files.length >= maxFiles
            ? "Maximum files selected"
            : "Drop files here or click to browse"}
        </p>
        <p className="ws-file-upload-hint">
          PDF, images, or documents · up to {maxFiles} files
        </p>
      </div>
      {files.length > 0 ? (
        <ul className="ws-file-upload-list" aria-live="polite">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${index}`}>
              <FileText size={14} aria-hidden />
              <span className="ws-file-upload-name">{file.name}</span>
              <span className="ws-file-upload-size">{formatProofFileSize(file.size)}</span>
              <button
                aria-label={`Remove ${file.name}`}
                className="ws-file-upload-remove"
                type="button"
                onClick={() => applyFiles(files.filter((_, fileIndex) => fileIndex !== index))}
              >
                <X size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const DIALOG_COPY: Record<
  Exclude<DialogMode, null>,
  { title: string; lead?: string }
> = {
  complete: {
    title: "Submit proof for verification",
    lead: `Upload proof for your reporting manager to review. Up to ${TASK_PROOF_MAX_FILES} files, max ${formatTaskProofMaxSize()} each.`,
  },
  revision: {
    title: "Request revision",
    lead: "Tell your manager what should change so they can update the task.",
  },
  extension: {
    title: "Request new due date",
    lead: "Propose a later due date and explain why you need more time.",
  },
  help: {
    title: "Ask assigner for help",
    lead: "Describe what is blocking you so your manager can assist quickly.",
  },
};

export function TaskUserActions({ task }: { task: TaskRow }) {
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!dialog) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [dialog]);

  const urgency = getTaskDueUrgency({
    dueAt: task.dueAt,
    status: task.status,
    completedAt: task.completedAt,
  });
  const urgencyClass = taskUrgencyClass(urgency);
  const showUrgencyBadge = urgency === "due-overdue" || urgency === "due-today";

  const hasOpenRequest = task.openRequest != null;
  const isWaiting =
    task.status === "REVISION_REQUESTED" ||
    task.status === "EXTENSION_REQUESTED" ||
    task.status === "HELP_REQUESTED" ||
    task.status === "AWAITING_VERIFICATION";

  function submitAction(
    action: (taskId: string, formData: FormData) => Promise<{ ok: boolean; message: string }>,
    formData: FormData,
  ) {
    startTransition(async () => {
      const result = await action(task.id, formData);
      if (!result.ok) {
        setFeedback(result.message);
        return;
      }
      setDialog(null);
      setFeedback(null);
    });
  }

  if (!task.canAct || task.status === "COMPLETED") {
    return null;
  }

  if (task.status === "AWAITING_VERIFICATION" && task.isAssignee) {
    return (
      <div className="ws-task-request-banner">
        <AlertCircle size={15} aria-hidden />
        <div>
          <strong>Proof submitted — awaiting verification</strong>
          <p>Your reporting manager will review the proof and mark the task complete.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {hasOpenRequest ? (
        <div className="ws-task-request-banner">
          <AlertCircle size={15} aria-hidden />
          <div>
            <strong>{task.openRequest?.label}</strong>
            {task.openRequest?.message ? <p>{task.openRequest.message}</p> : null}
          </div>
          {task.isAssignee ? (
            <button
              className="ws-task-action-btn"
              disabled={pending}
              type="button"
              onClick={() =>
                startTransition(() => {
                  void cancelAssigneeRequest(task.id);
                })
              }
            >
              Cancel request
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="ws-task-actions ws-task-actions-assignee">
        {!isWaiting ? (
          <>
            <button
              className="ws-task-action-btn ws-task-action-complete"
              disabled={pending}
              type="button"
              onClick={() => {
                setFeedback(null);
                setDialog("complete");
              }}
            >
              <CheckCircle2 size={14} aria-hidden />
              Submit proof
            </button>
            <button
              className="ws-task-action-btn"
              disabled={pending}
              type="button"
              onClick={() => {
                setFeedback(null);
                setDialog("revision");
              }}
            >
              <RotateCcw size={15} aria-hidden />
              Ask revision
            </button>
            <button
              className="ws-task-action-btn"
              disabled={pending}
              type="button"
              onClick={() => {
                setFeedback(null);
                setDialog("extension");
              }}
            >
              <CalendarPlus size={15} aria-hidden />
              New due date
            </button>
            <button
              className="ws-task-action-btn ws-task-action-warning"
              disabled={pending}
              type="button"
              onClick={() => {
                setFeedback(null);
                setDialog("help");
              }}
            >
              <HelpCircle size={15} aria-hidden />
              Ask for help
            </button>
          </>
        ) : null}

        {task.isRecurring ? (
          <p className="ws-task-recurring-hint">
            After verification, the next occurrence is scheduled automatically.
          </p>
        ) : null}
      </div>

      {dialog && mounted
        ? createPortal(
            <div className="workspace-app ws-task-edit-portal">
              <div
                className="ws-task-edit-overlay"
                role="presentation"
                onClick={() => setDialog(null)}
              >
              <form
                className="ws-task-edit-panel ws-task-user-dialog"
                role="dialog"
                aria-labelledby={`task-dialog-${task.id}`}
                onClick={(event) => event.stopPropagation()}
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  if (dialog === "complete") {
                    submitAction(completeTaskWithProof, formData);
                  } else if (dialog === "revision") {
                    submitAction(submitTaskRevisionRequest, formData);
                  } else if (dialog === "extension") {
                    submitAction(submitTaskExtensionRequest, formData);
                  } else if (dialog === "help") {
                    submitAction(submitTaskHelpRequest, formData);
                  }
                }}
              >
                <header className="ws-task-edit-head ws-task-user-dialog-head">
                  <div className="ws-task-dialog-head-main">
                    <div className="ws-task-dialog-title-row">
                      <h3 id={`task-dialog-${task.id}`}>
                        {dialog === "complete" ? (
                          <CheckCircle2 size={18} aria-hidden />
                        ) : dialog === "revision" ? (
                          <RotateCcw size={18} aria-hidden />
                        ) : dialog === "extension" ? (
                          <CalendarPlus size={18} aria-hidden />
                        ) : (
                          <HelpCircle size={18} aria-hidden />
                        )}
                        {DIALOG_COPY[dialog].title}
                      </h3>
                      {showUrgencyBadge ? (
                        <span className={`ws-task-urgency-pill ${urgencyClass}`}>
                          {taskUrgencyLabel(urgency)}
                        </span>
                      ) : null}
                    </div>
                    <p className="ws-task-edit-sub">{task.title}</p>
                  </div>
                  <button
                    className="ws-task-edit-close"
                    type="button"
                    onClick={() => setDialog(null)}
                  >
                    <X size={18} />
                    <span className="sr-only">Close</span>
                  </button>
                </header>

                <div className="ws-task-edit-body ws-task-user-dialog-body">
                  <section className="ws-form-section ws-form-section-first ws-task-user-dialog-section">
                    {DIALOG_COPY[dialog].lead ? (
                      <p className="ws-task-dialog-lead">{DIALOG_COPY[dialog].lead}</p>
                    ) : null}

                    <div className="form-grid-premium ws-task-edit-form-grid">
                      {dialog === "complete" ? (
                        <>
                          <TaskProofFileUpload maxFiles={TASK_PROOF_MAX_FILES} />
                          <label className="ws-field form-field-full">
                            <span>Completion note (optional)</span>
                            <textarea
                              className="ws-field-textarea"
                              name="completionNote"
                              placeholder="What was done?"
                              rows={3}
                            />
                          </label>
                        </>
                      ) : null}

                      {dialog === "extension" ? (
                        <label className="ws-field form-field-full">
                          <span>Proposed next due date</span>
                          <input
                            defaultValue={defaultExtensionValue(task.dueAt)}
                            name="proposedDueAt"
                            required
                            type="datetime-local"
                          />
                        </label>
                      ) : null}

                      {dialog !== "complete" ? (
                        <label className="ws-field form-field-full">
                          <span>
                            {dialog === "revision"
                              ? "What needs to change?"
                              : dialog === "help"
                                ? "Why do you need help?"
                                : "Reason for extension"}
                          </span>
                          <textarea
                            className="ws-field-textarea ws-field-textarea-lg"
                            minLength={5}
                            name="message"
                            required
                            rows={4}
                            placeholder="Explain clearly so your manager can respond."
                          />
                        </label>
                      ) : null}
                    </div>
                  </section>

                  {feedback ? (
                    <p className="ws-form-error ws-task-dialog-error">{feedback}</p>
                  ) : null}
                </div>

                <footer className="ws-task-edit-actions ws-task-user-dialog-actions">
                  <button className="btn-ghost btn-compact" type="button" onClick={() => setDialog(null)}>
                    Cancel
                  </button>
                  <button
                    className="btn-cta btn-primary btn-compact ws-task-dialog-submit"
                    disabled={pending}
                    type="submit"
                  >
                    {dialog === "complete" ? (
                      <>
                        <FileUp size={14} aria-hidden />
                        Submit proof
                      </>
                    ) : dialog === "help" ? (
                      "Send help request"
                    ) : dialog === "extension" ? (
                      "Request extension"
                    ) : (
                      "Send revision request"
                    )}
                  </button>
                </footer>
              </form>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
