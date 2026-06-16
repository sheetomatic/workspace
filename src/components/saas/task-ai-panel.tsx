"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ParsedTaskDraft } from "@/lib/integrations/openai";
import { Mic, MicOff } from "lucide-react";
import { SheetomaticAiMark } from "@/components/saas/sheetomatic-ai-mark";

type Props = {
  onDraft: (draft: ParsedTaskDraft) => void;
  compact?: boolean;
};

function isAiPanelErrorMessage(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("quota") ||
    lower.includes("billing") ||
    lower.includes("invalid") ||
    lower.includes("failed") ||
    lower.includes("error") ||
    lower.includes("denied") ||
    lower.includes("too short") ||
    lower.includes("network")
  );
}

export function TaskAiPanel({ onDraft, compact = false }: Props) {
  const [instruction, setInstruction] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopTracks = useCallback(() => {
    const stream = mediaRecorderRef.current?.stream;
    stream?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    return () => stopTracks();
  }, [stopTracks]);

  async function parseInstruction(text: string) {
    const trimmed = text.trim();
    if (trimmed.length < 8) {
      setMessage("Add a few more words, then parse again.");
      return false;
    }

    try {
      const res = await fetch("/api/tasks/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: trimmed }),
      });
      const data = (await res.json()) as {
        draft?: ParsedTaskDraft;
        error?: string;
      };
      if (!res.ok) {
        setMessage(data.error ?? "Could not parse task.");
        return false;
      }
      if (data.draft) {
        onDraft(data.draft);
        setMessage("Task fields filled. Review below and assign.");
        return true;
      }
      return false;
    } catch {
      setMessage("Network error while parsing.");
      return false;
    }
  }

  async function handleParseClick() {
    setBusy(true);
    setMessage("");
    await parseInstruction(instruction);
    setBusy(false);
  }

  function pickRecorderMimeType() {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];
    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return "";
  }

  function fileExtensionForMime(mime: string) {
    if (mime.includes("mp4")) {
      return "m4a";
    }
    if (mime.includes("ogg")) {
      return "ogg";
    }
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
        const ext = fileExtensionForMime(recordedMime);
        form.append("audio", blob, `recording.${ext}`);
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
            setInstruction(data.text);
            setMessage("Voice converted to English. Parsing task...");
            await parseInstruction(data.text);
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
      className={`ws-task-ai-panel${compact ? " ws-task-ai-panel-compact" : ""}`}
    >
      <div className="ws-task-ai-head">
        <h3>
          <SheetomaticAiMark size={18} />
          AI input
        </h3>
      </div>
      {!compact ? (
        <p className="ws-task-ai-lead">
          Speak or type in any language. Voice is converted to English, then the
          form is filled.
        </p>
      ) : null}

      <label className="ws-task-ai-instruction">
        {!compact ? "Instruction" : null}
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="e.g. Every Monday assign payment follow-up to Amit, email + WA"
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
          <SheetomaticAiMark size={16} />
          {busy && !recording ? "Parsing..." : "Parse with AI"}
        </button>
        {recording ? (
          <button
            className="btn-cta btn-secondary ws-recording-active"
            type="button"
            onClick={stopRecording}
          >
            <MicOff size={16} aria-hidden />
            Stop recording
          </button>
        ) : (
          <button
            className="btn-cta btn-secondary"
            disabled={busy}
            type="button"
            onClick={() => void startRecording()}
          >
            <Mic size={16} aria-hidden />
            Record voice
          </button>
        )}
      </div>

      {message ? (
        <p
          className={
            isAiPanelErrorMessage(message)
              ? "saas-form-message error"
              : "saas-form-message ok"
          }
        >
          {message}
          {message.toLowerCase().includes("quota") ||
          message.toLowerCase().includes("billing") ? (
            <>
              {" "}
              You can still assign tasks manually in the form below.
            </>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}
