"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Paperclip, Save, Upload } from "lucide-react";
import {
  completeFmsStepAction,
  saveFmsStepNotesAction,
  uploadFmsStepAttachmentAction,
} from "@/app/app/fms/actions";
import { fmsInitialState } from "@/lib/fms-action-state";
import type { FmsCaptureField } from "@/lib/fms/constants";
import type { FmsStepCompleteState } from "@/components/saas/fms-step-complete-panel";

const FMS_ATTACHMENT_ACCEPT =
  "image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv";

type StepAttachment = {
  id: string;
  fileName: string;
  fileSize: number;
};

type AccountabilityMeta = {
  doerName: string;
  delayLabel: string | null;
  isOverdue: boolean;
  plannedAt: Date | null;
};

function formatDueDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function FmsStepActionBar({
  stepState,
  canComplete,
  stepName,
  initialNotes = "",
  existingAttachments = [],
  accountability,
  quickComplete = false,
  embedded = false,
}: {
  stepState: FmsStepCompleteState;
  canComplete: boolean;
  stepName: string;
  initialNotes?: string | null;
  existingAttachments?: StepAttachment[];
  accountability?: AccountabilityMeta;
  quickComplete?: boolean;
  /** Hide duplicate title when parent page already shows current stop */
  embedded?: boolean;
}) {
  const router = useRouter();
  const uploadFormRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotes = stepState.step.allowNotes !== false;
  const showUpload = canComplete && stepState.step.allowUpload !== false;
  const showMarkDone = stepState.step.allowMarkDone !== false;

  const [markedDone, setMarkedDone] = useState(false);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [notesDirty, setNotesDirty] = useState(false);
  const [completionValues, setCompletionValues] = useState<Record<string, string>>(
    {},
  );

  const captureFields = Array.isArray(stepState.step.captureFields)
    ? (stepState.step.captureFields as FmsCaptureField[])
    : [];
  const hasRequiredCapture = captureFields.some((field) => field.required);
  const useQuickComplete =
    quickComplete &&
    canComplete &&
    showMarkDone &&
    !hasRequiredCapture &&
    (!showUpload || existingAttachments.length > 0);

  const [completeState, completeAction, completePending] = useActionState(
    completeFmsStepAction,
    fmsInitialState,
  );
  const [uploadState, uploadAction, uploadPending] = useActionState(
    uploadFmsStepAttachmentAction,
    fmsInitialState,
  );
  const [saveNotesState, saveNotesAction, saveNotesPending] = useActionState(
    saveFmsStepNotesAction,
    fmsInitialState,
  );

  useEffect(() => {
    setNotes(initialNotes ?? "");
    setNotesDirty(false);
    setMarkedDone(useQuickComplete);
    setCompletionValues({});
  }, [stepState.id, initialNotes, useQuickComplete]);

  useEffect(() => {
    if (!completeState.ok) {
      return;
    }
    setMarkedDone(false);
    setNotes("");
    setNotesDirty(false);
    router.refresh();
  }, [completeState.ok, router]);

  useEffect(() => {
    if (!uploadState.ok) {
      return;
    }
    uploadFormRef.current?.reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    router.refresh();
  }, [uploadState.ok, router]);

  useEffect(() => {
    if (!saveNotesState.ok) {
      return;
    }
    setNotesDirty(false);
    router.refresh();
  }, [saveNotesState.ok, router]);

  function setCaptureValue(key: string, value: string) {
    setCompletionValues((prev) => ({ ...prev, [key]: value }));
  }

  if (!canComplete) {
    return (
      <div className="ws-fms-step-action-bar ws-fms-step-work-panel">
        <header className="ws-fms-step-work-head">
          <p className="ws-fms-step-work-eyebrow">Your accountability stop</p>
          <h3 className="ws-fms-step-work-title">{stepName}</h3>
        </header>
        <p className="ws-fms-muted ws-fms-step-action-bar-wait">
          {!stepState.ownerUserId
            ? "No doer assigned. Claim this stop above or ask a manager to assign someone."
            : "Only the assigned doer can act on this stop."}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`ws-fms-step-action-bar ws-fms-step-work-panel is-compact${embedded ? " is-embedded" : ""}${useQuickComplete ? " is-quick-complete" : ""}`}
    >
      {!embedded ? (
        <header className="ws-fms-step-work-head">
          <div className="ws-fms-step-work-head-copy">
            <h3 className="ws-fms-step-work-title">
              <span className="ws-fms-step-work-eyebrow">Your stop</span>
              {stepName}
            </h3>
          </div>
          {showMarkDone && !useQuickComplete ? (
            <label className="ws-fms-step-work-done-toggle">
              <input
                checked={markedDone}
                className="ws-fms-step-action-chip-input"
                type="checkbox"
                onChange={(event) => setMarkedDone(event.target.checked)}
              />
              <span className="ws-fms-step-work-done-label">
                <CheckCircle2 size={15} aria-hidden />
                Mark done
              </span>
            </label>
          ) : null}
        </header>
      ) : null}

      {accountability && !useQuickComplete ? (
        <div className="ws-fms-step-work-accountability-row">
          <dl className="ws-fms-step-work-accountability is-inline">
            <div>
              <dt>Doer</dt>
              <dd>{accountability.doerName}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                {accountability.isOverdue && accountability.delayLabel ? (
                  <span className="ws-fms-train-delay-badge is-late">
                    {accountability.delayLabel}
                  </span>
                ) : accountability.plannedAt ? (
                  <span className="ws-fms-train-delay-badge is-ok">On track</span>
                ) : (
                  <span className="ws-fms-train-delay-badge is-neutral">In progress</span>
                )}
              </dd>
            </div>
            {accountability.plannedAt ? (
              <div>
                <dt>Due</dt>
                <dd>{formatDueDate(accountability.plannedAt)}</dd>
              </div>
            ) : null}
          </dl>
          {embedded && showMarkDone && !useQuickComplete ? (
            <label className="ws-fms-step-work-done-toggle">
              <input
                checked={markedDone}
                className="ws-fms-step-action-chip-input"
                type="checkbox"
                onChange={(event) => setMarkedDone(event.target.checked)}
              />
              <span className="ws-fms-step-work-done-label">
                <CheckCircle2 size={15} aria-hidden />
                Mark done
              </span>
            </label>
          ) : null}
        </div>
      ) : null}

      {captureFields.length > 0 ? (
        <section className="ws-fms-step-work-section">
          <h4 className="ws-fms-step-work-section-title">Capture at this stop</h4>
          <div className="ws-fms-step-action-capture">
            {captureFields.map((field) => (
              <label key={field.key}>
                <span>
                  {field.label}
                  {field.required ? " *" : ""}
                </span>
                {field.type === "TEXT" ? (
                  <input
                    required={field.required}
                    value={completionValues[field.key] ?? ""}
                    onChange={(e) => setCaptureValue(field.key, e.target.value)}
                  />
                ) : null}
                {field.type === "NUMBER" ? (
                  <input
                    type="number"
                    required={field.required}
                    value={completionValues[field.key] ?? ""}
                    onChange={(e) => setCaptureValue(field.key, e.target.value)}
                  />
                ) : null}
                {field.type === "DATE" ? (
                  <input
                    type="date"
                    required={field.required}
                    value={completionValues[field.key] ?? ""}
                    onChange={(e) => setCaptureValue(field.key, e.target.value)}
                  />
                ) : null}
                {field.type === "DATETIME" ? (
                  <input
                    type="datetime-local"
                    required={field.required}
                    value={completionValues[field.key] ?? ""}
                    onChange={(e) => setCaptureValue(field.key, e.target.value)}
                  />
                ) : null}
              </label>
            ))}
          </div>
        </section>
      ) : null}

      {showNotes && !useQuickComplete ? (
        <section className="ws-fms-step-work-section is-compact">
          <h4 className="ws-fms-step-work-section-title">Notes</h4>
          <label className="ws-fms-step-action-notes">
            <span className="sr-only">Notes for this stop</span>
            <textarea
              placeholder="Optional remarks"
              rows={3}
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value);
                setNotesDirty(true);
              }}
            />
          </label>
          <div className="ws-fms-step-work-notes-actions">
            <form action={saveNotesAction} className="ws-fms-step-work-save-notes-form">
              <input type="hidden" name="stepStateId" value={stepState.id} />
              <input type="hidden" name="notes" value={notes} readOnly />
              <button
                className="btn-secondary btn-sm ws-fms-step-work-save-notes-btn"
                disabled={saveNotesPending || !notesDirty}
                type="submit"
              >
                <Save size={13} aria-hidden />
                {saveNotesPending ? "Saving..." : "Save notes"}
              </button>
            </form>
            {saveNotesState.message ? (
              <p className={saveNotesState.ok ? "ws-form-success" : "ws-form-error"}>
                {saveNotesState.message}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {showUpload && !useQuickComplete ? (
        <section className="ws-fms-step-work-section is-compact">
          <h4 className="ws-fms-step-work-section-title">
            <Paperclip size={14} aria-hidden />
            Attachment
          </h4>
          {existingAttachments.length > 0 ? (
            <ul className="ws-fms-step-work-attachments">
              {existingAttachments.map((file) => (
                <li key={file.id}>
                  <a
                    className="ws-fms-step-work-attachment-link"
                    href={`/api/fms/attachments/${file.id}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {file.fileName}
                  </a>
                  <span className="ws-fms-step-work-attachment-size">
                    {Math.round(file.fileSize / 1024)} KB
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <form
            ref={uploadFormRef}
            action={uploadAction}
            className="ws-fms-step-work-upload ws-fms-step-work-upload-row"
            encType="multipart/form-data"
          >
            <input type="hidden" name="stepStateId" value={stepState.id} />
            <label className="ws-fms-step-work-file-drop">
              <span className="ws-fms-step-work-file-label">Choose file to upload</span>
              <input
                ref={fileInputRef}
                accept={FMS_ATTACHMENT_ACCEPT}
                className="ws-fms-step-work-file-input"
                disabled={uploadPending}
                name="attachment"
                required
                type="file"
              />
            </label>
            <button
              className="btn-secondary btn-sm ws-fms-step-action-upload-btn"
              disabled={uploadPending}
              type="submit"
            >
              <Upload size={14} aria-hidden />
              {uploadPending ? "Uploading..." : "Upload"}
            </button>
          </form>
          {uploadState.message ? (
            <p className={uploadState.ok ? "ws-form-success" : "ws-form-error"}>
              {uploadState.message}
            </p>
          ) : null}
        </section>
      ) : null}

      <footer className="ws-fms-step-work-footer is-compact">
        {showMarkDone && !markedDone && !useQuickComplete ? (
          <p className="ws-fms-step-work-footer-hint">
            Mark done to complete
          </p>
        ) : (
          <span className="ws-fms-step-work-footer-spacer" aria-hidden />
        )}
        <div className="ws-fms-step-work-footer-actions">
          {completeState.message && !completeState.ok ? (
            <p className="ws-form-error ws-fms-step-work-footer-msg">
              {completeState.message}
            </p>
          ) : null}
          <form
            action={completeAction}
            className="ws-fms-step-action-complete-form"
            encType="multipart/form-data"
          >
            <input type="hidden" name="stepStateId" value={stepState.id} />
            <input type="hidden" name="notes" value={notes} readOnly />
            <input
              type="hidden"
              name="completionValuesJson"
              value={JSON.stringify(completionValues)}
              readOnly
            />
            <button
              className={`btn-primary btn-sm ws-sf-btn-primary ws-fms-step-action-submit${useQuickComplete ? " is-quick-complete" : ""}`}
              disabled={
                completePending || (showMarkDone && !markedDone && !useQuickComplete)
              }
              type="submit"
            >
              {completePending
                ? "Completing..."
                : useQuickComplete
                  ? "Complete stop"
                  : "Complete step"}
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
