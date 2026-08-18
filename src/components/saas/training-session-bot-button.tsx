"use client";

import { useState, useTransition } from "react";
import { runLearnSessionBotAction } from "@/app/app/leads/training-session-bot-action";
import { SheetomaticAiMark } from "@/components/saas/sheetomatic-ai-mark";

export function TrainingSessionBotButton({
  slotId,
  disabled,
  onDone,
  variant = "row",
}: {
  slotId: string;
  disabled?: boolean;
  onDone?: (result: { ok: boolean; message: string }) => void;
  variant?: "row" | "bar";
}) {
  const [pending, startTransition] = useTransition();
  const [hint, setHint] = useState<string | null>(null);

  function run() {
    startTransition(async () => {
      setHint(null);
      const result = await runLearnSessionBotAction(slotId);
      setHint(result.message);
      onDone?.(result);
    });
  }

  return (
    <div className={`training-session-bot is-${variant}`}>
      <button
        type="button"
        className={
          variant === "bar"
            ? "learn-btn-primary training-session-bot-btn"
            : "ws-btn ws-btn-secondary training-slot-btn training-session-bot-btn"
        }
        disabled={disabled || pending}
        onClick={run}
        title="Pick the lesson and recording, then write them to the student Learn panel"
      >
        <SheetomaticAiMark variant="icon" sizes="sm" />
        {pending ? "Updating Learn…" : "Update Learn"}
      </button>
      {hint ? <p className="training-session-bot-hint">{hint}</p> : null}
    </div>
  );
}
