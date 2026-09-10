"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  clampDurationSec,
  formatMmSs,
  parseDurationFields,
} from "@/lib/video/duration";
import type { VideoJobDto } from "@/lib/video/jobs";
import "./video-studio-panel.css";

function statusLabel(status: VideoJobDto["status"]) {
  switch (status) {
    case "queued":
      return "Queued";
    case "running":
      return "Generating clips";
    case "succeeded":
      return "Ready";
    case "failed":
      return "Failed";
    case "not_configured":
      return "Not configured";
  }
}

function isActive(status: VideoJobDto["status"]) {
  return status === "queued" || status === "running";
}

export function VideoStudioPanel({
  configured,
  initialJobs,
}: {
  configured: boolean;
  initialJobs: VideoJobDto[];
}) {
  const [prompt, setPrompt] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"alert" | "status">("status");
  const [jobs, setJobs] = useState(initialJobs);
  const [selectedId, setSelectedId] = useState(initialJobs[0]?.id ?? "");
  const alertRef = useRef<HTMLParagraphElement>(null);

  const selected = jobs.find((job) => job.id === selectedId) ?? jobs[0] ?? null;

  const durationPreview = useMemo(() => {
    const m = minutes.trim() === "" ? null : Number(minutes);
    const s = seconds.trim() === "" ? null : Number(seconds);
    const parsed = parseDurationFields(
      m == null || Number.isNaN(m) ? null : m,
      s == null || Number.isNaN(s) ? null : s,
    );
    if (!parsed.ok) {
      return { ok: false as const, error: parsed.error, effective: null as number | null };
    }
    return {
      ok: true as const,
      error: null as string | null,
      effective: clampDurationSec(parsed.requested),
    };
  }, [minutes, seconds]);

  useEffect(() => {
    if (!selected || !isActive(selected.status)) {
      return;
    }
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/video/jobs/${selected.id}`);
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as { job?: VideoJobDto };
      if (!payload.job) {
        return;
      }
      setJobs((current) =>
        current.map((job) => (job.id === payload.job!.id ? payload.job! : job)),
      );
    }, 3000);
    return () => window.clearInterval(timer);
  }, [selected?.id, selected?.status]);

  useEffect(() => {
    if (messageKind === "alert" && message) {
      alertRef.current?.focus();
    }
  }, [message, messageKind]);

  async function generate() {
    if (busy) {
      return;
    }
    const trimmed = prompt.trim();
    if (!trimmed) {
      setMessageKind("alert");
      setMessage("Describe the video you want.");
      return;
    }
    const m = minutes.trim() === "" ? null : Number(minutes);
    const s = seconds.trim() === "" ? null : Number(seconds);
    const parsed = parseDurationFields(
      m == null || Number.isNaN(m) ? null : m,
      s == null || Number.isNaN(s) ? null : s,
    );
    if (!parsed.ok) {
      setMessageKind("alert");
      setMessage(parsed.error);
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/video/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          durationSec: parsed.requested ?? undefined,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        job?: VideoJobDto;
      };
      if (payload.job) {
        setJobs((current) => [
          payload.job!,
          ...current.filter((job) => job.id !== payload.job!.id),
        ]);
        setSelectedId(payload.job.id);
      }
      if (!response.ok) {
        setMessageKind("alert");
        setMessage(payload.error || "Could not start the video.");
        return;
      }
      setMessageKind("status");
      setMessage("Job started. Clips generate one at a time — this can take a while.");
    } catch {
      setMessageKind("alert");
      setMessage("Could not reach the video service. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="video-studio">
      {!configured ? (
        <div className="video-studio-unavailable" role="status">
          <strong>Video generation is not configured</strong>
          <p>
            Prompt-to-video is ready as a workspace studio, but no text-to-video
            provider is connected on this environment. Write a prompt anyway — we
            will not call a fake engine, and we will not play a stock clip.
          </p>
        </div>
      ) : null}

      <div className="video-studio-layout">
        <form
          className="video-studio-composer"
          onSubmit={(event) => {
            event.preventDefault();
            void generate();
          }}
        >
          <h2>Create a video</h2>
          <p>
            Same idea as Veo or Runway: describe what you want. Genre is whatever
            the prompt says.
          </p>
          <label>
            Prompt
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={7}
              placeholder="A jewellery workshop in Zaveri Bazaar, late afternoon, camera slowly pushing in on hands setting a stone…"
              required
            />
          </label>
          <fieldset className="video-studio-duration">
            <legend>Duration (optional)</legend>
            <div className="video-studio-duration-row">
              <label>
                Minutes
                <input
                  type="number"
                  min={0}
                  max={10}
                  inputMode="numeric"
                  value={minutes}
                  onChange={(event) => setMinutes(event.target.value)}
                />
              </label>
              <label>
                Seconds
                <input
                  type="number"
                  min={0}
                  max={59}
                  inputMode="numeric"
                  value={seconds}
                  onChange={(event) => setSeconds(event.target.value)}
                />
              </label>
            </div>
            <p className="video-studio-hint">
              Leave blank for a short clip. Max 10:00 — longer values are shortened
              to 10:00.
              {durationPreview.ok && durationPreview.effective != null ? (
                <> Effective length: {formatMmSs(durationPreview.effective)}.</>
              ) : null}
              {!durationPreview.ok ? <> {durationPreview.error}</> : null}
            </p>
          </fieldset>
          <button className="btn-cta" type="submit" disabled={busy}>
            {busy ? "Starting…" : "Generate"}
          </button>
          {message ? (
            <p
              ref={alertRef}
              className={
                messageKind === "alert"
                  ? "video-studio-message video-studio-message-alert"
                  : "video-studio-message"
              }
              role={messageKind === "alert" ? "alert" : "status"}
              tabIndex={-1}
            >
              {message}
            </p>
          ) : null}
        </form>

        <div className="video-studio-canvas">
          {selected && isActive(selected.status) ? (
            <div className="video-studio-progress" aria-live="polite">
              <p>
                <strong>{statusLabel(selected.status)}</strong>
                {selected.clipTotal > 0 ? (
                  <>
                    {" "}
                    · clip {selected.clipDone} of {selected.clipTotal}
                  </>
                ) : null}
              </p>
              <p>
                Built in short clips and stitched, not one long model call. A
                10-minute job can take a while — this status updates as clips
                finish.
              </p>
            </div>
          ) : null}

          {selected?.status === "succeeded" ? (
            <div className="video-studio-player">
              <video
                key={selected.id}
                controls
                playsInline
                src={`/api/video/jobs/${selected.id}/media`}
              >
                Your browser cannot play this video.
              </video>
              <a
                className="btn-secondary"
                href={`/api/video/jobs/${selected.id}/media`}
                download
              >
                Download
              </a>
              <p className="video-studio-hint">
                {formatMmSs(selected.finalDurationSec ?? selected.effectiveDurationSec)}
              </p>
            </div>
          ) : null}

          {selected?.status === "failed" ? (
            <p className="video-studio-message video-studio-message-alert" role="alert">
              {selected.error || "This job failed."}
            </p>
          ) : null}

          {selected?.status === "not_configured" ? (
            <p className="video-studio-hint" role="status">
              {selected.error ||
                "Saved. Generation will run when a provider is connected."}
            </p>
          ) : null}

          {!selected ? (
            <p className="video-studio-empty">
              No videos yet. Write a prompt and tap Generate.
            </p>
          ) : null}
        </div>
      </div>

      <section className="video-studio-history">
        <h2>This workspace</h2>
        {jobs.length === 0 ? (
          <p className="video-studio-empty">Nothing generated yet.</p>
        ) : (
          <ul className="video-studio-history-list">
            {jobs.map((job) => (
              <li key={job.id}>
                <button
                  type="button"
                  className={
                    job.id === selected?.id
                      ? "video-studio-history-row is-selected"
                      : "video-studio-history-row"
                  }
                  onClick={() => setSelectedId(job.id)}
                >
                  <span className="video-studio-history-prompt">{job.prompt}</span>
                  <span>
                    {statusLabel(job.status)} · {formatMmSs(job.effectiveDurationSec)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
