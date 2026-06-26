"use client";

import type { ParsedChecklistDraft } from "@/lib/integrations/openai";
import { SheetomaticAiInput } from "@/components/saas/sheetomatic-ai-input";
import type { ChecklistFrequency, ChecklistTeam } from "@prisma/client";

export function PcAiPanel({
  compact = false,
  onDraft,
}: {
  compact?: boolean;
  onDraft: (draft: ParsedChecklistDraft) => void;
  onConfigureNavigate?: () => void;
}) {
  async function handleParse(instruction: string) {
    const trimmed = instruction.trim();
    if (trimmed.length < 8) {
      return {
        ok: false,
        message: "Add a few more words, e.g. GST return on 5th every month for Amit.",
      };
    }

    try {
      const res = await fetch("/api/checklists/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: trimmed }),
      });
      const data = (await res.json()) as {
        draft?: ParsedChecklistDraft;
        error?: string;
      };
      if (!res.ok) {
        return { ok: false, message: data.error ?? "Could not parse checklist." };
      }
      if (data.draft) {
        onDraft(data.draft);
        return {
          ok: true,
          message: "Checklist fields filled. Review and save below.",
        };
      }
      return { ok: false, message: "No checklist draft returned." };
    } catch {
      return { ok: false, message: "Network error while parsing." };
    }
  }

  return (
    <SheetomaticAiInput
      compact={compact}
      lead="Say or type what recurring checklist you need - team, schedule, and doer. Works in any language."
      placeholder="e.g. GST return every month on 5th for accounts executive Digeshwar, email reminder"
      parseLabel="Build checklist"
      fallbackHint="You can still fill the form manually."
      onParse={handleParse}
    />
  );
}

export function applyChecklistDraftToForm(
  draft: ParsedChecklistDraft,
  setters: {
    setTitle: (value: string) => void;
    setInstructions: (value: string) => void;
    setFrequency: (value: ChecklistFrequency) => void;
    setTeam: (value: ChecklistTeam) => void;
    setAssigneeUserId: (value: string) => void;
    setRemindViaEmail: (value: boolean) => void;
    setDueMonthDay: (value: number) => void;
    setDueWeekday: (value: number) => void;
    setDueMonth: (value: number) => void;
  },
) {
  setters.setTitle(draft.title);
  setters.setInstructions(draft.instructions);
  if (
    [
      "WEEKLY",
      "FORTNIGHTLY",
      "MONTHLY",
      "QUARTERLY",
      "HALF_YEARLY",
      "YEARLY",
    ].includes(draft.frequency)
  ) {
    setters.setFrequency(draft.frequency as ChecklistFrequency);
  }
  if (
    ["ACCOUNTS", "HR", "MAINTENANCE", "QUALITY", "STORE", "GENERAL"].includes(
      draft.team,
    )
  ) {
    setters.setTeam(draft.team as ChecklistTeam);
  }
  if (draft.assigneeUserId) {
    setters.setAssigneeUserId(draft.assigneeUserId);
  }
  setters.setRemindViaEmail(draft.remindViaEmail);
  setters.setDueMonthDay(draft.dueMonthDay);
  setters.setDueWeekday(draft.dueWeekday);
  setters.setDueMonth(draft.dueMonth);
}
