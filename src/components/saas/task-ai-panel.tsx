"use client";

import type { ParsedTaskDraft } from "@/lib/integrations/openai";
import { isWhatsAppGreeting } from "@/lib/whatsapp-bot/normalize-command";
import { SheetomaticAiInput } from "@/components/saas/sheetomatic-ai-input";

type Props = {
  onDraft: (draft: ParsedTaskDraft) => void;
  compact?: boolean;
};

export function TaskAiPanel({ onDraft, compact = false }: Props) {
  async function handleParse(instruction: string) {
    const trimmed = instruction.trim();
    if (isWhatsAppGreeting(trimmed)) {
      return {
        ok: false,
        message:
          "Hi! Describe the task you want to create, for example: Assign payment follow-up to Amit today at 5pm.",
      };
    }
    if (trimmed.length < 8) {
      return {
        ok: false,
        message: "Add a few more words describing the task, then parse again.",
      };
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
        return { ok: false, message: data.error ?? "Could not parse task." };
      }
      if (data.draft) {
        onDraft(data.draft);
        return { ok: true, message: "Task fields filled. Review below and assign." };
      }
      return { ok: false, message: "No task draft returned." };
    } catch {
      return { ok: false, message: "Network error while parsing." };
    }
  }

  return (
    <SheetomaticAiInput
      compact={compact}
      placeholder="e.g. Every Monday assign payment follow-up to Amit, email + WA"
      fallbackHint="You can still assign tasks manually in the form below."
      onParse={handleParse}
    />
  );
}
