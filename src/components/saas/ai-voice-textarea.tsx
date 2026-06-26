"use client";

import { useCallback, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { fileExtensionForMime, pickRecorderMimeType } from "@/lib/ai-input";

export function AiVoiceTextarea({
  name,
  defaultValue = "",
  placeholder,
  rows = 2,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
}) {
  const [value, setValue] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [hint, setHint] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopTracks = useCallback(() => {
    mediaRecorderRef.current?.stream?.getTracks().forEach((track) => track.stop());
  }, []);

  async function startRecording() {
    setHint("");
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
        const recordedMime = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: recordedMime });
        if (blob.size < 1000) {
          setHint("Recording too short.");
          return;
        }
        setBusy(true);
        const form = new FormData();
        form.append("audio", blob, `note.${fileExtensionForMime(recordedMime)}`);
        try {
          const res = await fetch("/api/ai/transcribe", { method: "POST", body: form });
          const data = (await res.json()) as { text?: string; error?: string };
          if (!res.ok) {
            setHint(data.error ?? "Transcription failed.");
            return;
          }
          if (data.text) {
            const text = data.text;
            setValue((prev) => (prev ? `${prev}\n${text}` : text).trim());
            setHint("Voice added to notes.");
          }
        } catch {
          setHint("Could not transcribe.");
        } finally {
          setBusy(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setRecording(true);
    } catch {
      setHint("Microphone not available.");
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    setRecording(false);
  }

  return (
    <label className="ws-ai-voice-textarea">
      <div className="ws-ai-voice-textarea-head">
        <span>Notes (optional)</span>
        <button
          className={`btn-secondary btn-sm ws-ai-voice-btn${recording ? " is-recording" : ""}`}
          disabled={busy}
          type="button"
          onClick={() => void (recording ? stopRecording() : startRecording())}
        >
          {recording ? <MicOff size={14} aria-hidden /> : <Mic size={14} aria-hidden />}
          {recording ? "Stop" : busy ? "..." : "Voice"}
        </button>
      </div>
      <textarea
        name={name}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={value}
      />
      {hint ? <small className="ws-fms-muted">{hint}</small> : null}
    </label>
  );
}
