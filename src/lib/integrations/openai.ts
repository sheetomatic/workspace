import type {
  FmsFormFieldType,
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
import { slugifyFieldKey } from "@/lib/fms/constants";

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

export type ParsedFmsFormFieldDraft = {
  label: string;
  fieldType: FmsFormFieldType;
  required: boolean;
  options?: string[];
  dependsOn?: string;
  choicesByParent?: Record<string, string[]>;
  placeholder?: string;
  helpText?: string;
};

export type ParsedFmsFormDraft = {
  name: string;
  description: string;
  fields: ParsedFmsFormFieldDraft[];
};

const FMS_AI_TIMEOUT_MS = 45_000;

function fmsOpenAiModel() {
  return process.env.OPENAI_FMS_MODEL ?? process.env.OPENAI_TASK_MODEL ?? "gpt-4o-mini";
}

async function requestFmsOpenAiJson(
  systemPrompt: string,
  userContent: string,
): Promise<{
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_NOT_CONFIGURED");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FMS_AI_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: fmsOpenAiModel(),
        temperature: 0.2,
        max_tokens: 1800,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
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

    return {
      content,
      usage: {
        promptTokens: payload.usage?.prompt_tokens ?? 0,
        completionTokens: payload.usage?.completion_tokens ?? 0,
        totalTokens: payload.usage?.total_tokens ?? 0,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("OPENAI_TIMEOUT");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

const FMS_FIELD_TYPES: FmsFormFieldType[] = [
  "TEXT",
  "TEXTAREA",
  "EMAIL",
  "PHONE",
  "NUMBER",
  "ENUM",
  "ENUM_LIST",
  "DATE",
  "DATETIME",
  "FILE",
];

function normalizeFmsField(raw: Record<string, unknown>): ParsedFmsFormFieldDraft | null {
  const label =
    typeof raw.label === "string" && raw.label.trim() ? raw.label.trim() : "";
  if (!label) {
    return null;
  }

  const fieldType = FMS_FIELD_TYPES.includes(raw.fieldType as FmsFormFieldType)
    ? (raw.fieldType as FmsFormFieldType)
    : "TEXT";

  let options: string[] = [];
  let dependsOn: string | undefined;
  let choicesByParent: Record<string, string[]> | undefined;

  if (Array.isArray(raw.options)) {
    options = (raw.options as unknown[])
      .map(String)
      .map((option) => option.trim())
      .filter(Boolean);
  } else if (typeof raw.options === "string") {
    options = raw.options
      .split("\n")
      .map((option) => option.trim())
      .filter(Boolean);
  }

  if (typeof raw.dependsOn === "string" && raw.dependsOn.trim()) {
    dependsOn = raw.dependsOn.trim();
  }
  if (raw.choicesByParent && typeof raw.choicesByParent === "object") {
    choicesByParent = {};
    for (const [key, value] of Object.entries(
      raw.choicesByParent as Record<string, unknown>,
    )) {
      if (Array.isArray(value)) {
        choicesByParent[key] = value.map(String).filter(Boolean);
      }
    }
  }

  return {
    label,
    fieldType,
    required: Boolean(raw.required),
    options: fieldType === "ENUM" || fieldType === "ENUM_LIST" ? options : undefined,
    dependsOn:
      fieldType === "ENUM" && dependsOn && choicesByParent
        ? dependsOn
        : undefined,
    choicesByParent:
      fieldType === "ENUM" && dependsOn && choicesByParent
        ? choicesByParent
        : undefined,
    placeholder:
      typeof raw.placeholder === "string" && raw.placeholder.trim()
        ? raw.placeholder.trim()
        : undefined,
    helpText:
      typeof raw.helpText === "string" && raw.helpText.trim()
        ? raw.helpText.trim()
        : undefined,
  };
}

function ensureTimestampField(
  fields: ParsedFmsFormFieldDraft[],
): ParsedFmsFormFieldDraft[] {
  const hasTimestamp = fields.some(
    (field) =>
      field.fieldType === "DATETIME" &&
      (/timestamp/i.test(field.label) ||
        /^(submission_)?timestamp$/i.test(slugifyFieldKey(field.label))),
  );
  if (hasTimestamp) {
    return fields;
  }
  return [
    ...fields,
    {
      label: "Submission timestamp",
      fieldType: "DATETIME",
      required: false,
      helpText: "Auto-filled when the form is submitted.",
    },
  ];
}

function normalizeFmsFormDraft(raw: Record<string, unknown>): ParsedFmsFormDraft {
  const name =
    typeof raw.name === "string" && raw.name.trim().length >= 2
      ? raw.name.trim()
      : "New intake form";
  const description =
    typeof raw.description === "string" ? raw.description.trim() : "";

  const fieldsRaw = Array.isArray(raw.fields) ? raw.fields : [];
  const fields = ensureTimestampField(
    fieldsRaw
      .map((field) =>
        normalizeFmsField(
          typeof field === "object" && field !== null
            ? (field as Record<string, unknown>)
            : {},
        ),
      )
      .filter((field): field is ParsedFmsFormFieldDraft => field !== null),
  );

  return { name, description, fields };
}

export type FmsFormParseResult = {
  draft: ParsedFmsFormDraft;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

export async function parseFmsFormFromDescription(
  description: string,
  existingDraft?: ParsedFmsFormDraft,
): Promise<FmsFormParseResult> {
  const isRefine = Boolean(existingDraft?.fields?.length);
  const fieldSchema =
    "fields: [{label, fieldType: TEXT|TEXTAREA|EMAIL|PHONE|NUMBER|ENUM|ENUM_LIST|DATE|DATETIME|FILE, required, options?, dependsOn?, choicesByParent?, placeholder?, helpText?}]";
  const systemPrompt = isRefine
    ? `Refine an FMS intake form JSON. Input may be any language; output English JSON only with keys name, description, ${fieldSchema}. Apply requested edits; keep other fields unless asked to change. ALWAYS include a DATETIME field labeled "Submission timestamp" (or "Timestamp") — auto-filled on submit; add it if missing. For category/product patterns use ENUM parent + dependent ENUM child with dependsOn (parent field key slug) and choicesByParent map.`
    : `Design an FMS intake form JSON from a description. Input may be any language; output English JSON only with keys name, description, ${fieldSchema}. Map dropdown to ENUM, checkboxes to ENUM_LIST, uploads to FILE. Prefer 4-12 fields. MUST include a DATETIME field labeled "Submission timestamp" (auto-filled on submit, not user-entered). Use half-width pairs for short fields like first name + last name, email + phone when appropriate. When the user describes category then product (or similar parent-child dropdowns), add a parent ENUM and child ENUM with dependsOn set to the parent field key slug and choicesByParent mapping parent values to child option arrays.`;

  const userContent = isRefine
    ? `Current form JSON:\n${JSON.stringify(existingDraft)}\n\nChange:\n${description}`
    : description;

  const { content, usage } = await requestFmsOpenAiJson(systemPrompt, userContent);
  const parsed = JSON.parse(content) as Record<string, unknown>;

  return {
    draft: normalizeFmsFormDraft(parsed),
    usage,
  };
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

export type ParsedFmsFlowStepDraft = {
  stepName: string;
  ownerHint: string | null;
  howInstructions: string;
  tatValue: number;
  tatUnit: "hours" | "days";
};

export type ParsedFmsFlowDraft = {
  name: string;
  description: string;
  steps: ParsedFmsFlowStepDraft[];
};

export type FmsFlowchartParseResult =
  | {
      status: "ready";
      draft: ParsedFmsFlowDraft;
      usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
      };
    }
  | {
      status: "needs_clarification";
      questions: string[];
      usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
      };
    };

function normalizeFlowStep(raw: Record<string, unknown>): ParsedFmsFlowStepDraft | null {
  const stepName =
    typeof raw.stepName === "string" && raw.stepName.trim()
      ? raw.stepName.trim()
      : "";
  if (!stepName) {
    return null;
  }
  const howInstructions =
    typeof raw.howInstructions === "string" ? raw.howInstructions.trim() : "";
  if (!howInstructions) {
    return null;
  }
  const tatUnit = raw.tatUnit === "hours" ? "hours" : "days";
  const tatValue =
    typeof raw.tatValue === "number" && raw.tatValue > 0
      ? Math.round(raw.tatValue)
      : 1;
  const ownerHint =
    typeof raw.ownerHint === "string" && raw.ownerHint.trim()
      ? raw.ownerHint.trim()
      : null;
  return {
    stepName,
    ownerHint,
    howInstructions,
    tatValue,
    tatUnit,
  };
}

function normalizeFlowDraft(raw: Record<string, unknown>): ParsedFmsFlowDraft {
  const name =
    typeof raw.name === "string" && raw.name.trim()
      ? raw.name.trim()
      : "Untitled workflow";
  const description =
    typeof raw.description === "string" ? raw.description.trim() : "";
  const steps = Array.isArray(raw.steps)
    ? raw.steps
        .map((item) =>
          item && typeof item === "object"
            ? normalizeFlowStep(item as Record<string, unknown>)
            : null,
        )
        .filter((step): step is ParsedFmsFlowStepDraft => step !== null)
    : [];
  return { name, description, steps };
}

export async function parseFmsFlowchartFromDescription(
  description: string,
  options?: {
    members?: TaskMemberHint[];
    existingDraft?: ParsedFmsFlowDraft;
    clarificationAnswers?: string;
  },
): Promise<FmsFlowchartParseResult> {
  const members = options?.members ?? [];
  const memberList = members
    .map((m) => `- ${m.name} (${m.email})`)
    .join("\n");
  const isRefine = Boolean(options?.existingDraft?.steps?.length);

  const systemPrompt = `You design FMS workflow flowcharts for Indian MSME teams. Input may be any language; output English JSON only.

Return JSON with keys:
- status: "ready" OR "needs_clarification"
- questions: string[] (1-3 short questions ONLY when status is needs_clarification — e.g. missing process type, unclear owners, or vague steps)
- name: workflow title
- description: one-line summary
- steps: [{ stepName, ownerHint, howInstructions, tatValue, tatUnit: "hours"|"days" }]

Rules:
- Use status "needs_clarification" when the request is too vague to build at least 2 meaningful steps (single word, no process described, no hint of who does what).
- When ready, produce 2-8 linear steps in execution order after form submit.
- ownerHint: assign a team member name from the list, or a role like "Accounts team" if no match.
- howInstructions: concrete action the owner performs (1-2 sentences).
- tatValue/tatUnit: realistic turnaround; use hours for same-day tasks, days for multi-day (Mon-Sat working days).
- Prefer ready over asking questions when reasonable defaults exist.

Team members:
${memberList || "(none listed — use role labels)"}`;

  let userContent = description;
  if (options?.clarificationAnswers?.trim()) {
    userContent = `${description}\n\nUser clarifications:\n${options.clarificationAnswers.trim()}`;
  }
  if (isRefine && options?.existingDraft) {
    userContent = `Current flow JSON:\n${JSON.stringify(options.existingDraft)}\n\nChange or refine:\n${userContent}`;
  }

  const { content, usage } = await requestFmsOpenAiJson(systemPrompt, userContent);
  const parsed = JSON.parse(content) as Record<string, unknown>;

  if (parsed.status === "needs_clarification") {
    const questions = Array.isArray(parsed.questions)
      ? parsed.questions
          .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
          .slice(0, 3)
      : [];
    if (questions.length === 0) {
      questions.push("What process should this workflow handle?");
    }
    return { status: "needs_clarification", questions, usage };
  }

  const draft = normalizeFlowDraft(parsed);
  if (draft.steps.length === 0) {
    return {
      status: "needs_clarification",
      questions: [
        "Which steps should happen after the form is submitted?",
        "Who owns each step on your team?",
      ],
      usage,
    };
  }

  return { status: "ready", draft, usage };
}
