"use client";

import type { TrainingMaterialView } from "@/lib/courses/session-materials";
import { TRAINING_DOCUMENT_ACCEPT } from "@/lib/courses/session-materials";
import {
  addTrainingSessionDocumentAction,
  removeTrainingSessionMaterialAction,
  saveTrainingSessionRecordingAction,
} from "@/app/app/leads/training-session-actions";

export function TrainingSlotContentEditor({
  slotId,
  status,
  materials,
  pending,
  run,
}: {
  slotId: string;
  status: string;
  materials: TrainingMaterialView[];
  pending: boolean;
  run: (work: () => Promise<{ ok: boolean; message: string }>) => void;
}) {
  return (
    <div className="training-slot-content">
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
          No recording or documents on this session yet.
        </p>
      )}

      <form
        className="training-slot-content-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          run(async () => {
            const result = await saveTrainingSessionRecordingAction(data);
            if (result.ok) form.reset();
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
            placeholder="https://drive.google.com/…"
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

      <form
        className="training-slot-content-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          run(async () => {
            const result = await addTrainingSessionDocumentAction(data);
            if (result.ok) form.reset();
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
    </div>
  );
}
