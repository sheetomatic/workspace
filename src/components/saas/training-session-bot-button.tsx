"use client";

import { useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
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
  const [open, setOpen] = useState(false);

  function run() {
    startTransition(async () => {
      setHint(null);
      setOpen(false);
      const result = await runLearnSessionBotAction(slotId);
      setHint(result.message);
      onDone?.(result);
    });
  }

  const button = (
    <button
      type="button"
      className={
        variant === "bar"
          ? "learn-btn-primary training-session-bot-btn"
          : "ws-btn ws-btn-secondary training-slot-btn training-session-bot-btn"
      }
      disabled={disabled || pending}
      onClick={run}
      title={
        hint ||
        "Pick the lesson and recording, then write them to the student Learn panel"
      }
    >
      <SheetomaticAiMark variant="icon" sizes="sm" />
      {pending ? "Updating Learn…" : "Update Learn"}
    </button>
  );

  if (variant === "row") {
    return button;
  }

  return (
    <div className="training-session-bot is-bar">
      {button}
      {hint ? (
        <button
          type="button"
          className="training-session-bot-toggle"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? "Hide result" : "Show result"}
          <ChevronDown size={14} />
        </button>
      ) : null}
      {hint && open ? <p className="training-session-bot-hint">{hint}</p> : null}
    </div>
  );
}
