"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { generateFmsFormFromAiAction } from "@/app/app/fms/actions";
import { SheetomaticAiMark } from "@/components/saas/sheetomatic-ai-mark";
import {
  buildStubFormAiPrompt,
  countMeaningfulFormFields,
  isStubFmsForm,
} from "@/lib/fms/form-ai";
import type { ParsedFmsFormDraft } from "@/lib/integrations/openai";

function isErrorMessage(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("unavailable") ||
    lower.includes("quota") ||
    lower.includes("failed") ||
    lower.includes("error") ||
    lower.includes("limit") ||
    lower.includes("describe") ||
    lower.includes("words") ||
    lower.includes("network")
  );
}

export function FmsFormAiBar({
  formName,
  formDescription,
  workflowHint = "",
  existingDraft,
  onReady,
  compact = false,
}: {
  formName: string;
  formDescription: string;
  workflowHint?: string;
  existingDraft?: ParsedFmsFormDraft;
  onReady: (draft: ParsedFmsFormDraft) => void;
  compact?: boolean;
}) {
  const [prompt, setPrompt] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const isStub = existingDraft ? isStubFmsForm(existingDraft) : true;

  const stopTracks = useCallback(() => {
    mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
  }, []);

  useEffect(() => () => stopTracks(), [stopTracks]);

  async function runGenerate(text: string) {
    const trimmed = text.trim();
    const contextPrompt =
      isStub && existingDraft
        ? buildStubFormAiPrompt(existingDraft, trimmed, workflowHint)
        : trimmed;

    if (!isStub && contextPrompt.length < 8) {
      setMessage("Add a few more words describing your form.");
      return;
    }
    if (isStub && contextPrompt.length < 12) {
      setMessage(
        "Add a form name or description first, or type what to collect.",
      );
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const result = await generateFmsFormFromAiAction({
        description: contextPrompt,
        workflowHint: isStub ? workflowHint : undefined,
        existingDraft: isStub ? undefined : existingDraft,
      });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      if (countMeaningfulFormFields(result.draft) === 0) {
        setMessage(
          "AI returned no usable fields. Tap Build again or describe vendor, amount, and dates.",
        );
        return;
      }

      onReady(result.draft);
      setPrompt("");
      setMessage(
        isStub
          ? `Form generated with ${countMeaningfulFormFields(result.draft)} fields. Review before saving.`
          : "Form updated. Review changes before saving.",
      );
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function pickRecorderMimeType() {
    for (const type of [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ]) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return "";
  }

  function fileExtensionForMime(mime: string) {
    if (mime.includes("mp4")) return "m4a";
    if (mime.includes("ogg")) return "ogg";
    return "webm";
  }

  async function startRecording() {
    setMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stopTracks();
        await new Promise((r) => setTimeout(r, 150));
        const recordedMime = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: recordedMime });
        if (blob.size < 1000) {
          setMessage("Hold the mic longer (2-3 seconds) and try again.");
          return;
        }
        setBusy(true);
        const form = new FormData();
        form.append(
          "audio",
          blob,
          `recording.${fileExtensionForMime(recordedMime)}`,
        );
        try {
          const res = await fetch("/api/tasks/transcribe", {
            method: "POST",
            body: form,
          });
          const data = (await res.json()) as { text?: string; error?: string };
          if (!res.ok) {
            setMessage(data.error ?? "Transcription failed.");
            return;
          }
          if (data.text) {
            setPrompt(data.text);
            setMessage("Got it. Building your form...");
            await runGenerate(data.text);
          }
        } catch {
          setMessage("Could not upload recording.");
        } finally {
          setBusy(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setRecording(true);
    } catch {
      setMessage("Microphone access denied or unavailable.");
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.requestData();
      window.setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
      }, 200);
    }
    setRecording(false);
  }

  const defaultHint =
    formName.trim() || formDescription.trim()
      ? `Build fields for ${formName.trim() || "this form"}`
      : "Describe your form";

  return (
    <section className={`ws-fms-flow-ai ws-fms-form-ai${compact ? " is-compact" : ""}`}>
      <div className="ws-fms-flow-ai-head">
        <SheetomaticAiMark variant="icon" sizes="lg" />
        <div>
          <h3>{isStub ? "Generate intake form with AI" : "Refine form with AI"}</h3>
          <p className="ws-fms-muted">
            {compact
              ? "Voice or text to update fields"
              : isStub
                ? "Speak or type what to collect. AI builds all fields in seconds."
                : "Describe changes, e.g. add phone field or make vendor name required."}
          </p>
        </div>
      </div>

      <div className="ws-fms-flow-ai-input-row">
        <textarea
          className="ws-fms-flow-ai-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            isStub
              ? `${defaultHint}: vendor name, PO amount, delivery date, supporting documents...`
              : "Refine with AI, e.g. add phone field or make all required"
          }
          rows={compact ? 2 : 3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void runGenerate(prompt);
            }
          }}
        />
      </div>

      <div className="ws-fms-flow-ai-actions">
        {recording ? (
          <button
            type="button"
            className="btn-cta btn-secondary ws-recording-active"
            onClick={stopRecording}
          >
            <MicOff size={18} aria-hidden />
            Stop
          </button>
        ) : (
          <button
            type="button"
            className="btn-cta btn-primary ws-fms-flow-voice-btn"
            disabled={busy}
            onClick={() => void startRecording()}
          >
            <Mic size={18} aria-hidden />
            {busy ? "Working..." : "Voice"}
          </button>
        )}
        <button
          type="button"
          className="btn-cta btn-secondary"
          disabled={busy || recording}
          onClick={() => void runGenerate(prompt)}
        >
          <SheetomaticAiMark variant="icon" sizes="sm" className="ws-fms-ai-btn-mark" />
          {busy && !recording
            ? "Building..."
            : isStub
              ? "Auto-generate fields"
              : "Apply with AI"}
        </button>
      </div>

      {message ? (
        <p
          className={
            isErrorMessage(message)
              ? "ws-fms-flow-ai-message saas-form-message error"
              : "ws-fms-flow-ai-message saas-form-message ok"
          }
          role="status"
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
