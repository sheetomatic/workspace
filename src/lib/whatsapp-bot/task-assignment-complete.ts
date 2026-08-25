import type { ParsedTaskDraft } from "@/lib/integrations/openai";
import {
  instructionSpecifiesDueDate,
  instructionSpecifiesDueTime,
} from "@/lib/task-due-ist";

const PLACEHOLDER_PARTY =
  /^(x|someone|somebody|client|customer|party|them|him|her|the client|a client|vendor|party name)\b/i;

const COLLECT_RE =
  /\b(collect|collection|cash|payment|paise|amount|receive|vasool|le lo|lekar)\b/i;

const DATE_STOP =
  /(?:today|tonight|tomorrow|tmrw|tmw|aaj|kal|parso|by|due|at|before|and)\b/i;

function isRealParty(party: string | null | undefined) {
  const value = party?.trim() ?? "";
  return Boolean(value) && value.length >= 2 && !PLACEHOLDER_PARTY.test(value);
}

function collectParties(instruction: string) {
  const parties: string[] = [];
  const english = instruction.matchAll(
    /\bfrom\s+(.+?)(?:\s+(?:today|tonight|tomorrow|tmrw|tmw|aaj|kal|parso|by|due|at|before|and)\b|[.,\n]|$)/gi,
  );
  for (const match of english) {
    const party = match[1]?.trim();
    if (party) {
      parties.push(party);
    }
  }
  const hindi = instruction.matchAll(
    /\b([a-z][\w\s.&'-]{1,30}?)\s+(?:se|paas se)\b/gi,
  );
  for (const match of hindi) {
    const party = match[1]?.trim();
    if (party) {
      parties.push(party);
    }
  }
  return parties;
}

export function extractCounterparty(instruction: string) {
  const parties = collectParties(instruction);
  const real = [...parties].reverse().find((party) => isRealParty(party));
  return real ?? parties.at(-1) ?? null;
}

export function needsCounterparty(instruction: string) {
  if (!COLLECT_RE.test(instruction)) {
    return false;
  }
  return !isRealParty(extractCounterparty(instruction));
}

export function assignmentGaps(instruction: string, draft: ParsedTaskDraft) {
  const missing: string[] = [];
  if (!draft.assigneeUserId && !draft.assigneeHint?.trim()) {
    missing.push("assignee");
  }
  if (needsCounterparty(instruction)) {
    missing.push("counterparty");
  }
  if (!instructionSpecifiesDueDate(instruction)) {
    missing.push("due_date");
  }
  if (!draft.dueAtIso || !instructionSpecifiesDueTime(instruction)) {
    missing.push("due_time");
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

function looksLikeNameOnlyReply(text: string) {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 40) {
    return false;
  }
  if (looksLikeNewAssignment(trimmed)) {
    return false;
  }
  if (instructionSpecifiesDueDate(trimmed) || instructionSpecifiesDueTime(trimmed)) {
    return false;
  }
  if (/\bfrom\b/i.test(trimmed) || DATE_STOP.test(trimmed)) {
    return false;
  }
  return /^[a-z][\w\s.&'-]{1,38}$/i.test(trimmed);
}

export function mergeAssignmentFollowUp(pendingInstruction: string, reply: string) {
  const trimmed = reply.trim();
  if (!trimmed) {
    return pendingInstruction;
  }
  if (needsCounterparty(pendingInstruction) && looksLikeNameOnlyReply(trimmed)) {
    return `${pendingInstruction}\nfrom ${trimmed}`;
  }
  return `${pendingInstruction}\n\nAdditional details from assigner: ${trimmed}`;
}

export function expandTaskCopy(
  draft: ParsedTaskDraft,
  instruction: string,
): Pick<ParsedTaskDraft, "title" | "instructions"> {
  const party = extractCounterparty(instruction);
  const realParty = isRealParty(party) ? party : null;
  const assignee = draft.assigneeHint?.trim() || "the assigned team member";
  let title = draft.title.trim();
  const wordCount = title.split(/\s+/).filter(Boolean).length;
  if (wordCount < 8 || title.length < 36) {
    if (COLLECT_RE.test(instruction) && realParty) {
      title = `Collect cash from ${realParty} and complete the handover as assigned to ${assignee}`;
    } else if (COLLECT_RE.test(instruction)) {
      title = `Collect the pending cash payment and complete handover as assigned to ${assignee}`;
    } else if (title.length < 8) {
      title = `${title || "Complete the assigned work"} as instructed for ${assignee}`.trim();
    }
  }

  const existing = draft.instructions.trim();
  const alreadyHowTo =
    existing.length >= 160 &&
    /how to|when finished|reply done/i.test(existing);

  if (alreadyHowTo) {
    return { title, instructions: existing };
  }

  const workLine = COLLECT_RE.test(instruction)
    ? realParty
      ? `Meet or call ${realParty}, collect the agreed cash, count it in front of them, write the amount, and hand it over to the assigner or the cash desk the same day.`
      : "Meet or call the person, collect the agreed cash, count it in front of them, write the amount, and hand it over to the assigner or the cash desk the same day."
    : `Complete this work in full: ${instruction.trim().replace(/\s+/g, " ")}.`;

  const lines = [
    `Doer: ${assignee}.`,
    realParty ? `Collect from / deal with: ${realParty}.` : null,
    existing ? `Owner note: ${existing}` : null,
    "",
    "How to / what should be done:",
    `1. ${workLine}`,
    "2. If the amount is short, refused, or the person is not available, message the assigner on WhatsApp immediately with the reason.",
    "3. Keep a simple note of who paid, how much, and the time of collection.",
    "4. When finished, reply Done on the task WhatsApp so the owner can see it in the next review.",
  ].filter((line): line is string => line !== null);

  return { title, instructions: lines.join("\n") };
}

export function assignmentClarifyText(params: {
  missing: string[];
  assigneeHint: string | null;
  title: string;
}) {
  const who = params.assigneeHint?.trim() || "the team member";
  const needBothDue =
    params.missing.includes("due_date") && params.missing.includes("due_time");
  const lines = [
    "*Need a few details before I create this task*",
    "",
    params.title ? `Draft: ${params.title}` : null,
    `Assignee: ${who}`,
    "",
    "Please reply with the missing details:",
  ].filter((line): line is string => Boolean(line));

  if (params.missing.includes("assignee")) {
    lines.push("• Who should do this? (team member name)");
  }
  if (params.missing.includes("counterparty")) {
    lines.push("• Collect from whom? (full name of the person or shop)");
  }
  if (needBothDue) {
    lines.push("• Due date and time (example: today 5:00 PM, tomorrow 11:00 AM)");
  } else if (params.missing.includes("due_date")) {
    lines.push("• Due date (example: today, tomorrow, 26/08)");
  } else if (params.missing.includes("due_time")) {
    lines.push("• Due time (example: 5:00 PM, 11:00 AM)");
  }
  lines.push("", "Reply *cancel* to drop this draft.");
  return lines.join("\n");
}
