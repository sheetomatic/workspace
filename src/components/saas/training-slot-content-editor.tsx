"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { TrainingMaterialView } from "@/lib/courses/session-materials";
import { TRAINING_DOCUMENT_ACCEPT } from "@/lib/courses/session-materials";
import {
  addTrainingSessionDocumentAction,
  removeTrainingSessionMaterialAction,
  saveTrainingSessionRecordingAction,
} from "@/app/app/leads/training-session-actions";
import { TrainingSessionBotButton } from "@/components/saas/training-session-bot-button";

type AddPanel = "recording" | "document" | null;

export function TrainingSlotContentEditor({
  slotId,
  status,
  materials,
  pending,
  run,
  onClose,
}: {
  slotId: string;
  status: string;
  materials: TrainingMaterialView[];
  pending: boolean;
  run: (work: () => Promise<{ ok: boolean; message: string }>) => void;
  onClose?: () => void;
}) {
  const [openPanel, setOpenPanel] = useState<AddPanel>(null);

  function toggle(panel: Exclude<AddPanel, null>) {
    setOpenPanel((current) => (current === panel ? null : panel));
  }

  return (
    <div className="training-slot-content">
      <div className="training-slot-content-head">
        <p className="training-slot-content-kicker">Session files</p>
        {onClose ? (
          <button
            type="button"
            className="ws-btn ws-btn-secondary training-slot-btn"
            onClick={onClose}
          >
            Close
          </button>
        ) : null}
      </div>
      <div className="training-slot-content-toolbar">
        <TrainingSessionBotButton
          slotId={slotId}
          disabled={pending}
          onDone={(result) => {
            void run(async () => result);
          }}
        />
      </div>
      {materials.length > 0 ? (
        <ul className="training-material-list">
          {materials.map((item) => (
            <li key={item.id}>
              <a href={item.href} target="_blank" rel="noopener noreferrer">
                {item.kind === "RECORDING" ? "Recording" : "Document"}: {item.title}
              </a>
              <button
                type="button"
                className="ws-btn ws-btn-secondary training-slot-btn"
                disabled={pending}
                onClick={() =>
                  run(() => removeTrainingSessionMaterialAction(item.id))
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="training-slot-content-empty">
          No files on this session yet. Use Update Learn, or add a recording or
          document below.
        </p>
      )}

      <div className="training-slot-add">
        <button
          type="button"
          className="training-slot-add-toggle"
          aria-expanded={openPanel === "recording"}
          onClick={() => toggle("recording")}
        >
          Add recording
          <ChevronDown size={16} />
        </button>
        {openPanel === "recording" ? (
          <form
            className="training-slot-content-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const data = new FormData(form);
              run(async () => {
                const result = await saveTrainingSessionRecordingAction(data);
                if (result.ok) {
                  form.reset();
                  setOpenPanel(null);
                }
                return result;
              });
            }}
          >
            <input type="hidden" name="slotId" value={slotId} />
            {status !== "COMPLETED" ? (
              <input type="hidden" name="markComplete" value="1" />
            ) : null}
            <label>
              Recording title
              <input name="title" type="text" placeholder="Session recording" />
            </label>
            <label>
              Recording link
              <input
                name="url"
                type="url"
                required
                placeholder="https://youtu.be/… (Unlisted)"
              />
            </label>
            <button type="submit" className="ws-btn ws-btn-secondary" disabled={pending}>
              {pending
                ? "Saving…"
                : status === "COMPLETED"
                  ? "Save recording"
                  : "Mark done & save recording"}
            </button>
          </form>
        ) : null}

        <button
          type="button"
          className="training-slot-add-toggle"
          aria-expanded={openPanel === "document"}
          onClick={() => toggle("document")}
        >
          Add document
          <ChevronDown size={16} />
        </button>
        {openPanel === "document" ? (
          <form
            className="training-slot-content-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const data = new FormData(form);
              run(async () => {
                const result = await addTrainingSessionDocumentAction(data);
                if (result.ok) {
                  form.reset();
                  setOpenPanel(null);
                }
                return result;
              });
            }}
          >
            <input type="hidden" name="slotId" value={slotId} />
            <label>
              Document title
              <input name="title" type="text" placeholder="Notes / worksheet" />
            </label>
            <label>
              Document link
              <input name="url" type="url" placeholder="https://docs.google.com/…" />
            </label>
            <label>
              Or upload file
              <input name="file" type="file" accept={TRAINING_DOCUMENT_ACCEPT} />
            </label>
            <button type="submit" className="ws-btn ws-btn-secondary" disabled={pending}>
              {pending ? "Uploading…" : "Upload document"}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
