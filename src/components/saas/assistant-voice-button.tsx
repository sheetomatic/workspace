"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { fileExtensionForMime, pickRecorderMimeType } from "@/lib/ai-input";

/** Compact mic for floating Pulse panels — reuses /api/ai/transcribe. */
export function AssistantVoiceButton({
  disabled = false,
  onTranscript,
  transcribeUrl = "/api/ai/transcribe",
  className = "",
}: {
  disabled?: boolean;
  onTranscript: (text: string) => void;
  transcribeUrl?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [hint, setHint] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopTracks = useCallback(() => {
    mediaRecorderRef.current?.stream?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => () => stopTracks(), [stopTracks]);

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
          setHint("Too short — hold 2–3s.");
          return;
        }
        setBusy(true);
        const form = new FormData();
        form.append("audio", blob, `pulse.${fileExtensionForMime(recordedMime)}`);
        try {
          const res = await fetch(transcribeUrl, { method: "POST", body: form });
          const data = (await res.json()) as { text?: string; error?: string };
          if (!res.ok) {
            setHint(
              res.status === 401
                ? "Sign in to use voice."
                : data.error ?? "Transcription failed.",
            );
            return;
          }
          if (data.text?.trim()) {
            onTranscript(data.text.trim());
            setHint("");
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
      setHint("Microphone unavailable.");
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
    <span className={`assistant-voice-wrap ${className}`.trim()}>
      <button
        type="button"
        className={`assistant-voice-btn${recording ? " is-recording" : ""}`}
        disabled={disabled || busy}
        aria-label={recording ? "Stop recording" : "Ask Pulse by voice"}
        title={recording ? "Stop" : "Voice"}
        onClick={() => void (recording ? stopRecording() : startRecording())}
      >
        {recording ? <MicOff size={15} aria-hidden /> : <Mic size={15} aria-hidden />}
        <span className="assistant-voice-btn-label">
          {recording ? "Stop" : busy ? "…" : "Voice"}
        </span>
      </button>
      {hint ? (
        <span className="assistant-voice-hint" role="status">
          {hint}
        </span>
      ) : null}
    </span>
  );
}
