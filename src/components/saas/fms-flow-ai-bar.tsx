"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Sparkles } from "lucide-react";
import { generateFmsFlowchartFromAiAction } from "@/app/app/fms/design-actions";
import { SheetomaticAiMark } from "@/components/saas/sheetomatic-ai-mark";
import type { ParsedFmsFlowDraft } from "@/lib/integrations/openai";

function isErrorMessage(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("quota") ||
    lower.includes("failed") ||
    lower.includes("error") ||
    lower.includes("limit") ||
    lower.includes("network")
  );
}

export function FmsFlowAiBar({
  onReady,
  existingDraft,
  compact = false,
}: {
  onReady: (draft: ParsedFmsFlowDraft) => void;
  existingDraft?: ParsedFmsFlowDraft;
  compact?: boolean;
}) {
  const [prompt, setPrompt] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);
  const [clarifyAnswer, setClarifyAnswer] = useState("");
  const [pendingPrompt, setPendingPrompt] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopTracks = useCallback(() => {
    mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
  }, []);

  useEffect(() => () => stopTracks(), [stopTracks]);

  async function runGenerate(
    description: string,
    clarificationAnswers?: string,
  ) {
    const trimmed = description.trim();
    if (trimmed.length < 6) {
      setMessage("Say or type a bit more about your process.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const result = await generateFmsFlowchartFromAiAction({
        description: trimmed,
        clarificationAnswers,
        existingDraft,
      });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      if (result.needsClarification) {
        setPendingPrompt(trimmed);
        setQuestions(result.questions);
        setMessage("Quick question before I build your flow:");
        return;
      }

      setQuestions([]);
      setPendingPrompt("");
      setClarifyAnswer("");
      onReady(result.draft);
      setPrompt("");
      setMessage("Workflow ready. Confirm owner for each step below.");
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateClick() {
    await runGenerate(prompt);
  }

  async function handleClarifySubmit() {
    if (!clarifyAnswer.trim()) {
      setMessage("Answer the question so AI can build your flow.");
      return;
    }
    await runGenerate(pendingPrompt || prompt, clarifyAnswer);
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
    setQuestions([]);
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
        form.append("audio", blob, `recording.${fileExtensionForMime(recordedMime)}`);
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
            setMessage("Got it. Building your flowchart...");
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

  return (
    <section className={`ws-fms-flow-ai${compact ? " is-compact" : ""}`}>
      <div className="ws-fms-flow-ai-head">
        <SheetomaticAiMark variant="icon" sizes="lg" />
        <div>
          <h3>Auto workflow designer</h3>
          <p className="ws-fms-muted">
            {compact
              ? "Refine with voice or text"
              : "Describe the process — AI builds steps, then you confirm each step owner."}
          </p>
        </div>
      </div>

      {questions.length > 0 ? (
        <div className="ws-fms-flow-clarify">
          <p className="ws-fms-flow-clarify-lead">
            AI needs a quick clarification:
          </p>
          <ul>
            {questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
          <textarea
            rows={2}
            value={clarifyAnswer}
            onChange={(e) => setClarifyAnswer(e.target.value)}
            placeholder="Answer here, e.g. Trademark filing: legal team does intake, accounts handles fees..."
          />
          <button
            type="button"
            className="btn-cta btn-primary"
            disabled={busy}
            onClick={() => void handleClarifySubmit()}
          >
            <Sparkles size={16} aria-hidden />
            {busy ? "Building..." : "Build flowchart"}
          </button>
        </div>
      ) : (
        <>
          <div className="ws-fms-flow-ai-input-row">
            <textarea
              className="ws-fms-flow-ai-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. PO flow: sourcing shortlists vendor, founder approves, accounts pays in 2 days, warehouse receives goods..."
              rows={compact ? 2 : 3}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void handleGenerateClick();
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
              onClick={() => void handleGenerateClick()}
            >
              <Sparkles size={16} aria-hidden />
              {busy && !recording ? "Building..." : "Build with AI"}
            </button>
          </div>
        </>
      )}

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
