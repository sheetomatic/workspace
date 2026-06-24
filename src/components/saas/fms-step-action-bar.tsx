"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, StickyNote, Upload } from "lucide-react";
import {
  completeFmsStepAction,
  uploadFmsStepAttachmentAction,
} from "@/app/app/fms/actions";
import { fmsInitialState } from "@/lib/fms-action-state";
import type { FmsCaptureField } from "@/lib/fms/constants";
import { formatFmsAttachmentMaxSize } from "@/lib/fms/attachment-limits";
import type { FmsStepCompleteState } from "@/components/saas/fms-step-complete-panel";

const FMS_ATTACHMENT_ACCEPT =
  "image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv";

type ActionPanel = "done" | "notes" | "upload" | null;

export function FmsStepActionBar({
  stepState,
  canComplete,
  stepName,
  defaultOpenPanel = null,
}: {
  stepState: FmsStepCompleteState;
  canComplete: boolean;
  stepName: string;
  defaultOpenPanel?: ActionPanel;
}) {
  const router = useRouter();
  const uploadFormRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotes = stepState.step.allowNotes !== false;
  const showUpload = stepState.step.allowUpload !== false;
  const showMarkDone = stepState.step.allowMarkDone !== false;

  const [activePanel, setActivePanel] = useState<ActionPanel>(defaultOpenPanel);
  const [markedDone, setMarkedDone] = useState(defaultOpenPanel === "done");
  const [notes, setNotes] = useState("");
  const [completionValues, setCompletionValues] = useState<Record<string, string>>(
    {},
  );

  const captureFields = Array.isArray(stepState.step.captureFields)
    ? (stepState.step.captureFields as FmsCaptureField[])
    : [];

  const [completeState, completeAction, completePending] = useActionState(
    completeFmsStepAction,
    fmsInitialState,
  );
  const [uploadState, uploadAction, uploadPending] = useActionState(
    uploadFmsStepAttachmentAction,
    fmsInitialState,
  );

  useEffect(() => {
    if (!completeState.ok) {
      return;
    }
    setMarkedDone(false);
    setNotes("");
    setActivePanel(null);
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
    setActivePanel(null);
    router.refresh();
  }, [uploadState.ok, router]);

  function togglePanel(panel: Exclude<ActionPanel, null>) {
    setActivePanel((current) => (current === panel ? null : panel));
  }

  function setCaptureValue(key: string, value: string) {
    setCompletionValues((prev) => ({ ...prev, [key]: value }));
  }

  if (!canComplete) {
    return (
      <div className="ws-fms-step-action-bar">
        <p className="ws-fms-step-action-bar-title">
          Your stop: <strong>{stepName}</strong>
        </p>
        <p className="ws-fms-muted ws-fms-step-action-bar-wait">
          {!stepState.ownerUserId
            ? "No doer assigned. Claim this stop above or ask a manager to assign someone."
            : "Only the assigned doer can act on this stop."}
        </p>
      </div>
    );
  }

  return (
    <div className="ws-fms-step-action-bar">
      <p className="ws-fms-step-action-bar-title">
        Your stop: <strong>{stepName}</strong>
      </p>

      <div className="ws-fms-step-action-toolbar" role="toolbar" aria-label="Step actions">
        {showMarkDone ? (
          <label
            className={`ws-fms-step-action-chip${activePanel === "done" || markedDone ? " is-active" : ""}`}
          >
            <input
              checked={markedDone}
              className="ws-fms-step-action-chip-input"
              type="checkbox"
              onChange={(event) => {
                const checked = event.target.checked;
                setMarkedDone(checked);
                setActivePanel(checked ? "done" : null);
              }}
            />
            <span>Mark done</span>
          </label>
        ) : null}

        {showNotes ? (
          <button
            type="button"
            className={`ws-fms-step-action-icon${activePanel === "notes" ? " is-active" : ""}${notes.trim() ? " has-value" : ""}`}
            aria-label="Notes"
            aria-pressed={activePanel === "notes"}
            onClick={() => togglePanel("notes")}
          >
            <StickyNote size={18} aria-hidden />
          </button>
        ) : null}

        {showUpload ? (
          <button
            type="button"
            className={`ws-fms-step-action-icon${activePanel === "upload" ? " is-active" : ""}`}
            aria-label="Upload file"
            aria-pressed={activePanel === "upload"}
            onClick={() => togglePanel("upload")}
          >
            <Paperclip size={18} aria-hidden />
          </button>
        ) : null}
      </div>

      {activePanel === "done" && showMarkDone ? (
        <div className="ws-fms-step-action-panel">
          {captureFields.length === 0 ? (
            <p className="ws-fms-step-action-hint">
              Confirm and complete this stop to move the pipeline forward.
            </p>
          ) : null}
          {captureFields.length > 0 ? (
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
              className="btn-primary ws-sf-btn-primary ws-fms-step-action-submit"
              disabled={completePending || !markedDone}
              type="submit"
            >
              {completePending ? "Completing..." : "Complete step"}
            </button>
          </form>
        </div>
      ) : null}

      {activePanel === "notes" && showNotes ? (
        <div className="ws-fms-step-action-panel">
          <label className="ws-fms-step-action-notes">
            <span className="sr-only">Notes for this stop</span>
            <textarea
              placeholder="Optional remarks for this stop"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          <p className="ws-fms-step-action-hint">
            Notes are saved when you complete the step.
          </p>
        </div>
      ) : null}

      {activePanel === "upload" && showUpload ? (
        <div className="ws-fms-step-action-panel">
          <form
            ref={uploadFormRef}
            action={uploadAction}
            className="ws-fms-step-action-upload-form"
            encType="multipart/form-data"
          >
            <input type="hidden" name="stepStateId" value={stepState.id} />
            <label className="ws-fms-step-action-file">
              <span>Choose file</span>
              <input
                ref={fileInputRef}
                accept={FMS_ATTACHMENT_ACCEPT}
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
          <p className="ws-fms-step-action-hint">
            Images, videos, or documents (max {formatFmsAttachmentMaxSize()})
          </p>
        </div>
      ) : null}

      {completeState.message && activePanel === "done" ? (
        <p className={completeState.ok ? "ws-form-success" : "ws-form-error"}>
          {completeState.message}
        </p>
      ) : null}
      {uploadState.message && activePanel === "upload" ? (
        <p className={uploadState.ok ? "ws-form-success" : "ws-form-error"}>
          {uploadState.message}
        </p>
      ) : null}
    </div>
  );
}
