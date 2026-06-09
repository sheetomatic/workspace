import type {
  TaskDepartment,
  TaskFrequency,
  TaskPriority,
} from "@prisma/client";
import {
  parseMonthDayFromForm,
  parseWeeklyDaysFromForm,
  resolveFrequencyFromForm,
  serializeWeeklyDays,
} from "@/lib/task-schedule";
import { formatOpenAiError } from "@/lib/integrations/openai-errors";

export type TaskMemberHint = {
  id: string;
  name: string;
  email: string;
};

export type ParsedTaskDraft = {
  title: string;
  instructions: string;
  assigneeUserId: string | null;
  assigneeHint: string | null;
  priority: TaskPriority;
  department: TaskDepartment;
  category: string | null;
  dueAtIso: string;
  frequency: TaskFrequency;
  isRecurring: boolean;
  remindViaEmail: boolean;
  remindViaWhatsApp: boolean;
  recurrenceWeeklyDays: number[];
  recurrenceMonthDay: number | null;
};

const PRIORITIES: TaskPriority[] = ["HIGH", "MEDIUM", "LOW"];
const DEPARTMENTS: TaskDepartment[] = [
  "OPERATIONS",
  "SALES",
  "ACCOUNTS",
  "ADMIN",
  "GENERAL",
];

function defaultDueIso() {
  const d = new Date();
  d.setHours(17, 0, 0, 0);
  if (d.getTime() < Date.now()) {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString();
}

function resolveAssignee(
  hint: string | null | undefined,
  members: TaskMemberHint[],
): string | null {
  if (!hint?.trim()) {
    return null;
  }
  const q = hint.trim().toLowerCase();
  const byEmail = members.find((m) => m.email.toLowerCase() === q);
  if (byEmail) {
    return byEmail.id;
  }
  const byName = members.find(
    (m) =>
      m.name.toLowerCase() === q ||
      m.name.toLowerCase().includes(q) ||
      q.includes(m.name.toLowerCase()),
  );
  return byName?.id ?? null;
}

function normalizeDraft(
  raw: Record<string, unknown>,
  members: TaskMemberHint[],
): ParsedTaskDraft {
  const priority = PRIORITIES.includes(raw.priority as TaskPriority)
    ? (raw.priority as TaskPriority)
    : "MEDIUM";
  const department = DEPARTMENTS.includes(raw.department as TaskDepartment)
    ? (raw.department as TaskDepartment)
    : "GENERAL";

  let dueAtIso = defaultDueIso();
  if (typeof raw.dueAtIso === "string") {
    const parsed = new Date(raw.dueAtIso);
    if (!Number.isNaN(parsed.getTime())) {
      dueAtIso = parsed.toISOString();
    }
  }

  const assigneeHint =
    typeof raw.assigneeHint === "string" ? raw.assigneeHint : null;
  const rawAssignee =
    typeof raw.assigneeUserId === "string" ? raw.assigneeUserId : null;
  const assigneeUserId =
    rawAssignee && members.some((m) => m.id === rawAssignee)
      ? rawAssignee
      : resolveAssignee(assigneeHint ?? rawAssignee, members);

  return {
    title:
      typeof raw.title === "string" && raw.title.trim().length >= 3
        ? raw.title.trim()
        : "New delegated task",
    instructions:
      typeof raw.instructions === "string" ? raw.instructions.trim() : "",
    assigneeUserId,
    assigneeHint,
    priority,
    department,
    category:
      typeof raw.category === "string" && raw.category.trim()
        ? raw.category.trim().slice(0, 80)
        : null,
    dueAtIso,
    frequency: resolveFrequencyFromForm(
      typeof raw.frequency === "string" ? raw.frequency : "ONCE",
    ),
    isRecurring:
      Boolean(raw.isRecurring) ||
      resolveFrequencyFromForm(
        typeof raw.frequency === "string" ? raw.frequency : "ONCE",
      ) !== "ONCE",
    remindViaEmail: Boolean(raw.remindViaEmail),
    remindViaWhatsApp: Boolean(raw.remindViaWhatsApp),
    recurrenceWeeklyDays: Array.isArray(raw.recurrenceWeeklyDays)
      ? parseWeeklyDaysFromForm(
          (raw.recurrenceWeeklyDays as unknown[])
            .map(String)
            .join(","),
        )
      : typeof raw.recurrenceWeeklyDays === "string"
        ? parseWeeklyDaysFromForm(raw.recurrenceWeeklyDays)
        : [],
    recurrenceMonthDay:
      typeof raw.recurrenceMonthDay === "number"
        ? parseMonthDayFromForm(String(raw.recurrenceMonthDay))
        : typeof raw.recurrenceMonthDay === "string"
          ? parseMonthDayFromForm(raw.recurrenceMonthDay)
          : null,
  };
}

export type TaskParseResult = {
  draft: ParsedTaskDraft;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

export async function parseTaskFromInstruction(
  instruction: string,
  members: TaskMemberHint[],
): Promise<TaskParseResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_NOT_CONFIGURED");
  }

  const memberList = members
    .map((m) => `- id: ${m.id} | name: ${m.name} | email: ${m.email}`)
    .join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TASK_MODEL ?? "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You extract a delegated business task from owner instructions (voice transcript or typed text).

Input may be in ANY language or mix (e.g. Hindi, Hinglish, Tamil, Marathi, Gujarati, English). Understand meaning across languages.

Output JSON only with these keys. All string values MUST be in English:
- title (English, concise)
- instructions (English; empty string if none)
- assigneeHint (name or email fragment as spoken; may stay as proper name)
- priority: HIGH | MEDIUM | LOW
- department: OPERATIONS | SALES | ACCOUNTS | ADMIN | GENERAL
- category: optional project or category label in English (e.g. "MIS rollout", "Client onboarding"); empty string if none
- dueAtIso: ISO 8601 in Asia/Kolkata
- frequency: ONCE | DAILY | WEEKLY | MONTHLY (use WEEKLY for "every week", DAILY for daily, etc.)
- isRecurring: true if frequency is not ONCE or user asks for recurring task
- remindViaEmail: true if user wants email reminder
- remindViaWhatsApp: true if user wants WhatsApp reminder
- recurrenceWeeklyDays: array of weekday numbers 0=Sun through 6=Sat when WEEKLY (e.g. [1,3,5] for Mon/Wed/Fri)
- recurrenceMonthDay: integer 1-31 when MONTHLY (e.g. 15 for 15th each month)

Use Asia/Kolkata for "today", "tomorrow", and relative dates. Default due time 17:00 IST if not specified.
Match assignee to team by name or email when possible.
Default reminders: remindViaWhatsApp true when user mentions WhatsApp/WA; remindViaEmail true when user mentions email.

Team members:
${memberList}`,
        },
        { role: "user", content: instruction },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `OPENAI_ERROR:${formatOpenAiError(response.status, detail)}`,
    );
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OPENAI_EMPTY");
  }

  const parsed = JSON.parse(content) as Record<string, unknown>;
  return {
    draft: normalizeDraft(parsed, members),
    usage: {
      promptTokens: payload.usage?.prompt_tokens ?? 0,
      completionTokens: payload.usage?.completion_tokens ?? 0,
      totalTokens: payload.usage?.total_tokens ?? 0,
    },
  };
}

function extensionForMime(mimeType: string) {
  const mime = mimeType.toLowerCase();
  if (mime.includes("webm")) {
    return "webm";
  }
  if (mime.includes("mp4") || mime.includes("m4a")) {
    return "m4a";
  }
  if (mime.includes("ogg")) {
    return "ogg";
  }
  if (mime.includes("wav")) {
    return "wav";
  }
  if (mime.includes("mpeg") || mime.includes("mp3")) {
    return "mp3";
  }
  return "webm";
}

export async function transcribeAudioBuffer(
  audio: Buffer,
  mimeType: string,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_NOT_CONFIGURED");
  }

  if (audio.length < 1000) {
    throw new Error(
      "Recording too short. Hold the button longer (2-3 seconds) and try again.",
    );
  }

  const ext = extensionForMime(mimeType);
  const type = mimeType || `audio/${ext}`;
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(audio)], { type }),
    `recording.${ext}`,
  );
  const model = process.env.OPENAI_WHISPER_MODEL ?? "whisper-1";
  form.append("model", model);

  // translations: any spoken language -> English text (multilingual input, English output)
  // transcriptions: keep detected language in text (set OPENAI_WHISPER_OUTPUT=original)
  const outputEnglish = process.env.OPENAI_WHISPER_OUTPUT?.trim() !== "original";
  const endpoint = outputEnglish
    ? "https://api.openai.com/v1/audio/translations"
    : "https://api.openai.com/v1/audio/transcriptions";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(formatOpenAiError(response.status, detail));
  }

  const data = (await response.json()) as { text?: string };
  const text = data.text?.trim();
  if (!text) {
    throw new Error("No speech detected. Speak clearly and try again.");
  }
  return text;
}
