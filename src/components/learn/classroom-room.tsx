"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  endTrainingClassroomAction,
  startTrainingClassroomAction,
} from "@/app/app/leads/classroom-actions";
import "@/components/learn/classroom-room.css";

export function ClassroomRoom({
  role,
  live,
  configured,
  meetUrl,
  embedUrl,
  studentName,
  sessionNumber,
  title,
  whenLabel,
  slotId,
  error,
  backHref,
}: {
  role: "teacher" | "student";
  live: boolean;
  configured: boolean;
  meetUrl: string | null;
  embedUrl: string | null;
  studentName: string;
  sessionNumber: number;
  title: string;
  whenLabel: string;
  slotId: string;
  error?: string | null;
  backHref: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(error ?? null);
  const [consented, setConsented] = useState(role === "teacher");

  function startClass() {
    startTransition(async () => {
      const result = await startTrainingClassroomAction(slotId);
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  function endClass() {
    startTransition(async () => {
      const result = await endTrainingClassroomAction(slotId);
      setMessage(result.message);
      if (result.ok) router.push(backHref);
    });
  }

  const showFrame = Boolean(embedUrl) && (role === "teacher" || consented);

  return (
    <div className="classroom-shell">
      <header className="classroom-bar">
        <div>
          <p className="classroom-kicker">
            {role === "teacher" ? "Teach" : "Learn"} · Session {sessionNumber}
          </p>
          <h1>{title}</h1>
          <p>
            {studentName} · {whenLabel}
          </p>
        </div>
        <div className="classroom-actions">
          {role === "teacher" && !live ? (
            <button
              type="button"
              className="learn-btn-primary"
              disabled={pending || !configured}
              onClick={startClass}
            >
              {pending ? "Starting…" : "Start class"}
            </button>
          ) : null}
          {role === "teacher" && live ? (
            <button
              type="button"
              className="learn-btn-secondary"
              disabled={pending}
              onClick={endClass}
            >
              {pending ? "Ending…" : "End class"}
            </button>
          ) : null}
          {meetUrl ? (
            <a
              className="learn-btn-secondary"
              href={meetUrl}
              target="_blank"
              rel="noreferrer"
            >
              Meet fallback
            </a>
          ) : null}
          <Link className="learn-btn-secondary" href={backHref}>
            Back
          </Link>
        </div>
      </header>

      {message ? <p className="classroom-note">{message}</p> : null}

      {!configured && role === "teacher" ? (
        <p className="classroom-note">
          Add <code>DAILY_API_KEY</code> on Vercel to open the in-panel room.
          Until then use Meet fallback.
        </p>
      ) : null}

      {role === "student" && !live ? (
        <p className="classroom-note">
          Waiting for your trainer to start this class. Stay on this page or use
          Meet fallback if they sent one.
        </p>
      ) : null}

      {role === "student" && live && !consented ? (
        <label className="classroom-consent">
          <input
            type="checkbox"
            checked={consented}
            onChange={(event) => setConsented(event.target.checked)}
          />
          <span>
            I understand this class may be recorded. After class, the trainer
            shares an Unlisted YouTube link in Class files.
          </span>
        </label>
      ) : null}

      {showFrame && embedUrl ? (
        <iframe
          className="classroom-frame"
          title="Live class"
          src={embedUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          allowFullScreen
        />
      ) : live && !embedUrl ? (
        <p className="classroom-note">
          Room is live but the join token could not be created. Check Daily, or
          use Meet fallback.
        </p>
      ) : null}
    </div>
  );
}
