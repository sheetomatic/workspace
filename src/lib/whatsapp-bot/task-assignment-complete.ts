import type { ParsedTaskDraft } from "@/lib/integrations/openai";
import { instructionSpecifiesDueTime } from "@/lib/task-due-ist";

const PLACEHOLDER_PARTY =
  /^(x|someone|somebody|client|customer|party|them|him|her|the client|a client|vendor|party name)\b/i;

const COLLECT_RE =
  /\b(collect|collection|cash|payment|paise|amount|receive|vasool|le lo|lekar)\b/i;

export function extractCounterparty(instruction: string) {
  const fromEnglish = instruction.match(
    /\bfrom\s+(.+?)(?:\s+(?:today|tonight|tomorrow|tmrw|by|due|at|before|and)\b|[.,]|$)/i,
  );
  const fromHindi = instruction.match(
    /\b([a-z][\w\s.&'-]{1,30}?)\s+(?:se|paas se)\b/i,
  );
  const party = (fromEnglish?.[1] ?? fromHindi?.[1] ?? "").trim();
  return party || null;
}

export function needsCounterparty(instruction: string) {
  if (!COLLECT_RE.test(instruction)) {
    return false;
  }
  const party = extractCounterparty(instruction);
  if (!party) {
    return true;
  }
  return PLACEHOLDER_PARTY.test(party) || party.length < 2;
}

export function assignmentGaps(instruction: string, draft: ParsedTaskDraft) {
  const missing: string[] = [];
  if (!draft.assigneeUserId && !draft.assigneeHint?.trim()) {
    missing.push("assignee");
  }
  if (needsCounterparty(instruction)) {
    missing.push("counterparty");
  }
  if (!draft.dueAtIso || !instructionSpecifiesDueTime(instruction)) {
    missing.push("due_at");
  }
  return missing;
}

export function looksLikeNewAssignment(text: string) {
  return (
    /\b(assign|task to|assign to|assign karo|kaam do|delege)\b/i.test(text) &&
    text.trim().length > 18
  );
}

export function isCancelAssignment(text: string) {
  return /^(cancel|stop|never mind|forget it|menu)$/i.test(text.trim());
}

export function expandTaskCopy(
  draft: ParsedTaskDraft,
  instruction: string,
): Pick<ParsedTaskDraft, "title" | "instructions"> {
  const party = extractCounterparty(instruction);
  const assignee = draft.assigneeHint?.trim() || "the assigned team member";
  let title = draft.title.trim();
  const wordCount = title.split(/\s+/).filter(Boolean).length;
  if (wordCount < 8 || title.length < 36) {
    if (COLLECT_RE.test(instruction) && party && !PLACEHOLDER_PARTY.test(party)) {
      title = `Collect cash from ${party} and complete the handover as assigned to ${assignee}`;
    } else if (COLLECT_RE.test(instruction)) {
      title = `Collect the pending cash payment and complete handover as assigned to ${assignee}`;
    } else if (title.length < 8) {
      title = `${title || "Complete the assigned work"} as instructed for ${assignee}`.trim();
    }
  }

  const existing = draft.instructions.trim();
  if (existing.length >= 80) {
    return { title, instructions: existing };
  }

  const steps = [
    `Doer: ${assignee}.`,
    party && !PLACEHOLDER_PARTY.test(party)
      ? `Collect from / deal with: ${party}.`
      : null,
    existing ||
      (COLLECT_RE.test(instruction)
        ? "Meet or call the person, collect the agreed cash, count it in front of them, and note the amount."
        : `Complete this work: ${instruction.trim()}.`),
    "If anything is short or refused, message the assigner on WhatsApp immediately.",
    "When finished, reply Done on the task WhatsApp so the owner can see it in the next review.",
  ]
    .filter(Boolean)
    .join(" ");

  return { title, instructions: steps };
}

export function assignmentClarifyText(params: {
  missing: string[];
  assigneeHint: string | null;
  title: string;
}) {
  const who = params.assigneeHint?.trim() || "the team member";
  const lines = [
    "*Need a few details before I create this task*",
    "",
    params.title ? `Draft: ${params.title}` : null,
    `Assignee: ${who}`,
    "",
    "Please reply in one message:",
  ].filter((line): line is string => Boolean(line));

  if (params.missing.includes("assignee")) {
    lines.push("• Who should do this? (team member name)");
  }
  if (params.missing.includes("counterparty")) {
    lines.push("• Collect from whom? (full name of the person or shop)");
  }
  if (params.missing.includes("due_at")) {
    lines.push("• Due date and time (example: today 5:00 PM, tomorrow 11:00 AM)");
  }
  lines.push("", "Reply *cancel* to drop this draft.");
  return lines.join("\n");
}
