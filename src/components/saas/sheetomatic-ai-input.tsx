"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import {
  fileExtensionForMime,
  isAiInputErrorMessage,
  pickRecorderMimeType,
} from "@/lib/ai-input";
import { SheetomaticAiMark } from "@/components/saas/sheetomatic-ai-mark";

export type SheetomaticAiInputProps = {
  compact?: boolean;
  placeholder: string;
  lead?: string;
  parseLabel?: string;
  fallbackHint?: string;
  transcribeUrl?: string;
  initialInstruction?: string;
  onParse: (instruction: string) => Promise<{ ok: boolean; message: string }>;
};

export function SheetomaticAiInput({
  compact = false,
  placeholder,
  lead = "Speak or type in any language. Voice is converted to English, then fields are filled.",
  parseLabel = "Parse with AI",
  fallbackHint,
  transcribeUrl = "/api/ai/transcribe",
  initialInstruction = "",
  onParse,
}: SheetomaticAiInputProps) {
  const [instruction, setInstruction] = useState(initialInstruction);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (initialInstruction) {
      setInstruction(initialInstruction);
    }
  }, [initialInstruction]);

  const stopTracks = useCallback(() => {
    mediaRecorderRef.current?.stream?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => () => stopTracks(), [stopTracks]);

  async function handleParseClick() {
    setBusy(true);
    setMessage("");
    const result = await onParse(instruction);
    setMessage(result.message);
    setBusy(false);
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
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = async () => {
        stopTracks();
        await new Promise((resolve) => setTimeout(resolve, 150));
        const recordedMime = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: recordedMime });
        if (blob.size < 1000) {
          setMessage("Recording too short. Hold Record for at least 2-3 seconds.");
          return;
        }
        setBusy(true);
        const form = new FormData();
        form.append("audio", blob, `recording.${fileExtensionForMime(recordedMime)}`);
        try {
          const res = await fetch(transcribeUrl, { method: "POST", body: form });
          const data = (await res.json()) as { text?: string; error?: string };
          if (!res.ok) {
            setMessage(data.error ?? "Transcription failed.");
            return;
          }
          if (data.text) {
            setInstruction(data.text);
            setMessage("Voice converted. Parsing...");
            const result = await onParse(data.text);
            setMessage(result.message);
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
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      }, 200);
    }
    setRecording(false);
  }

  return (
    <section
      className={`ws-task-ai-panel ws-sheetomatic-ai-input${compact ? " ws-task-ai-panel-compact" : ""}`}
    >
      <div className="ws-task-ai-head">
        <h3>
          <SheetomaticAiMark variant="icon" sizes="sm" />
          AI input
        </h3>
      </div>
      {!compact ? <p className="ws-task-ai-lead">{lead}</p> : null}

      <label className="ws-task-ai-instruction">
        {!compact ? "Say or type" : null}
        <textarea
          value={instruction}
          onChange={(event) => setInstruction(event.target.value)}
          placeholder={placeholder}
          rows={compact ? 2 : 3}
        />
      </label>

      <div className="ws-task-ai-actions">
        <button
          className="btn-cta btn-secondary"
          disabled={busy || recording}
          type="button"
          onClick={() => void handleParseClick()}
        >
          <SheetomaticAiMark variant="icon" sizes="sm" />
          {busy && !recording ? "Working..." : parseLabel}
        </button>
        {recording ? (
          <button
            className="btn-cta btn-secondary ws-recording-active"
            type="button"
            onClick={stopRecording}
          >
            <MicOff size={16} aria-hidden />
            Stop
          </button>
        ) : (
          <button
            className="btn-cta btn-secondary"
            disabled={busy}
            type="button"
            onClick={() => void startRecording()}
          >
            <Mic size={16} aria-hidden />
            Voice
          </button>
        )}
      </div>

      {message ? (
        <p
          className={
            isAiInputErrorMessage(message)
              ? "saas-form-message error"
              : "saas-form-message ok"
          }
        >
          {message}
          {fallbackHint &&
          (message.toLowerCase().includes("quota") ||
            message.toLowerCase().includes("billing")) ? (
            <> {fallbackHint}</>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}
