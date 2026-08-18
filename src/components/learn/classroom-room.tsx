"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  endTrainingClassroomAction,
  startTrainingClassroomAction,
} from "@/app/app/leads/classroom-actions";
import { ClassroomBoardPanel } from "@/components/learn/classroom-board";
import { TrainingSessionBotButton } from "@/components/saas/training-session-bot-button";
import "@/components/learn/classroom-room.css";
import "@/components/learn/classroom-board.css";

export function ClassroomRoom({
  role,
  live,
  meetUrl,
  groupMeetUrl,
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
  configured?: boolean;
  meetUrl: string | null;
  groupMeetUrl?: string | null;
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
  const joinMeet = groupMeetUrl || meetUrl;
  const [view, setView] = useState<"room" | "board" | "both">(
    embedUrl ? "both" : "board",
  );

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

  const showFrame =
    Boolean(embedUrl) &&
    (role === "teacher" || consented) &&
    view !== "board";
  const showBoard = view !== "room" && (role === "teacher" || consented || !live);

  return (
    <div className="classroom-shell">
      <header className="classroom-bar">
        <div>
          <p className="classroom-kicker">
            {role === "teacher" ? "Teach" : "Learn"}
            {groupMeetUrl ? " · Group" : ""} · Session {sessionNumber}
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
              disabled={pending}
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
          {role === "teacher" ? (
            <TrainingSessionBotButton
              slotId={slotId}
              disabled={pending}
              variant="bar"
              onDone={(result) => {
                setMessage(result.message);
                if (result.ok) router.refresh();
              }}
            />
          ) : null}
          {joinMeet ? (
            <a
              className={live ? "learn-btn-primary" : "learn-btn-secondary"}
              href={joinMeet}
              target="_blank"
              rel="noreferrer"
            >
              Join Meet
            </a>
          ) : null}
          {meetUrl && groupMeetUrl && meetUrl !== groupMeetUrl ? (
            <a
              className="learn-btn-secondary"
              href={meetUrl}
              target="_blank"
              rel="noreferrer"
            >
              1:1 Meet
            </a>
          ) : null}
          <div className="classroom-views" role="tablist" aria-label="Class view">
            <button
              type="button"
              className={view === "room" ? "is-active" : undefined}
              onClick={() => setView("room")}
            >
              {embedUrl ? "Room" : "Meet"}
            </button>
            <button
              type="button"
              className={view === "board" ? "is-active" : undefined}
              onClick={() => setView("board")}
            >
              Board
            </button>
            <button
              type="button"
              className={view === "both" ? "is-active" : undefined}
              onClick={() => setView("both")}
            >
              Both
            </button>
          </div>
          <Link className="learn-btn-secondary" href={backHref}>
            Back
          </Link>
        </div>
      </header>

      {message ? <p className="classroom-note">{message}</p> : null}

      {role === "student" && !live ? (
        <p className="classroom-note">
          Waiting for your trainer to start. Use Join Meet when they share it,
          or stay here for the board.
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

      {showFrame || showBoard || (live && joinMeet && view !== "board") ? (
        <div
          className={`classroom-layout${view === "both" && (showFrame || joinMeet) ? " is-both" : ""}`}
        >
          {showFrame && embedUrl ? (
            <iframe
              className="classroom-frame"
              title="Live class"
              src={embedUrl}
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              allowFullScreen
            />
          ) : live && joinMeet && view !== "board" ? (
            <div className="classroom-meet-stage">
              <p className="classroom-kicker">Live on Google Meet</p>
              <h2>Join the call, teach on the board</h2>
              <p>
                Voice and camera stay in Meet. The spreadsheet board in this
                panel is what students follow.
              </p>
              <a
                className="learn-btn-primary"
                href={joinMeet}
                target="_blank"
                rel="noreferrer"
              >
                Join Meet
              </a>
            </div>
          ) : null}
          {showBoard ? (
            <ClassroomBoardPanel slotId={slotId} canEdit={role === "teacher"} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
