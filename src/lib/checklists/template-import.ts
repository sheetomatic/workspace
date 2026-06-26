import type { ChecklistFrequency, ChecklistReferenceKind, ChecklistTeam } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ensureChecklistOccurrence } from "@/lib/checklists/queries";

export const TEMPLATE_IMPORT_COLUMNS = [
  "title",
  "instructions",
  "team",
  "frequency",
  "dueHour",
  "dueMinute",
  "assigneeEmail",
  "references",
  "isActive",
] as const;

export const TEMPLATE_IMPORT_TEMPLATE_HEADERS = [...TEMPLATE_IMPORT_COLUMNS];

export const TEMPLATE_IMPORT_TEMPLATE_SAMPLE = [
  "Monthly GST filing",
  "File GSTR-3B before due date",
  "Accounts",
  "Monthly",
  "18",
  "0",
  "accounts@example.com",
  "https://gst.gov.in|https://youtube.com/watch?v=example",
  "Yes",
];

export type ChecklistTemplateImportRow = {
  title: string;
  instructions: string | null;
  team: ChecklistTeam;
  frequency: ChecklistFrequency;
  dueHour: number;
  dueMinute: number;
  assigneeEmail: string;
  references: string[];
  isActive: boolean;
};

export type ParsedChecklistImportRow = {
  rowNumber: number;
  data: ChecklistTemplateImportRow;
  raw: Record<string, string>;
  valid: boolean;
  errors: string[];
};

const TEAMS: ChecklistTeam[] = [
  "ACCOUNTS",
  "HR",
  "MAINTENANCE",
  "QUALITY",
  "STORE",
  "GENERAL",
];

const FREQUENCIES: ChecklistFrequency[] = [
  "WEEKLY",
  "FORTNIGHTLY",
  "MONTHLY",
  "QUARTERLY",
  "HALF_YEARLY",
  "YEARLY",
];

const TEAM_ALIASES: Record<string, ChecklistTeam> = {
  accounts: "ACCOUNTS",
  hr: "HR",
  maintenance: "MAINTENANCE",
  quality: "QUALITY",
  store: "STORE",
  general: "GENERAL",
};

const FREQUENCY_ALIASES: Record<string, ChecklistFrequency> = {
  weekly: "WEEKLY",
  fortnightly: "FORTNIGHTLY",
  monthly: "MONTHLY",
  quarterly: "QUARTERLY",
  "half-yearly": "HALF_YEARLY",
  halfyearly: "HALF_YEARLY",
  "half yearly": "HALF_YEARLY",
  yearly: "YEARLY",
  annual: "YEARLY",
};

function pick(raw: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const found = Object.keys(raw).find(
      (header) => header.trim().toLowerCase() === key.toLowerCase(),
    );
    if (found && raw[found] !== undefined && raw[found] !== null) {
      return String(raw[found]).trim();
    }
  }
  return "";
}

function parseNum(value: string, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const num = Number.parseInt(value, 10);
  return Number.isFinite(num) ? num : NaN;
}

function parseTeam(value: string): ChecklistTeam | null {
  const normalized = value.trim().toUpperCase().replaceAll(" ", "_");
  if (TEAMS.includes(normalized as ChecklistTeam)) {
    return normalized as ChecklistTeam;
  }
  const alias = TEAM_ALIASES[value.trim().toLowerCase()];
  return alias ?? null;
}

function parseFrequency(value: string): ChecklistFrequency | null {
  const normalized = value.trim().toUpperCase().replaceAll(" ", "_");
  if (FREQUENCIES.includes(normalized as ChecklistFrequency)) {
    return normalized as ChecklistFrequency;
  }
  return FREQUENCY_ALIASES[value.trim().toLowerCase()] ?? null;
}

function parseBool(value: string): boolean {
  const v = value.toLowerCase();
  if (!v) {
    return true;
  }
  return ["true", "yes", "y", "1", "active"].includes(v);
}

function parseReferences(value: string): string[] {
  if (!value.trim()) {
    return [];
  }
  return value
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

function referenceKind(href: string): ChecklistReferenceKind {
  if (/youtube\.com|youtu\.be/i.test(href)) {
    return "YOUTUBE";
  }
  return "WEB";
}

function referenceLabel(href: string) {
  try {
    const url = new URL(href);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return href.slice(0, 48);
  }
}

export function normalizeChecklistImportRow(
  raw: Record<string, string>,
  rowNumber: number,
): ParsedChecklistImportRow {
  const errors: string[] = [];

  const title = pick(raw, ["title", "checklist", "name"]);
  const instructions = pick(raw, ["instructions", "description"]) || null;
  const teamRaw = pick(raw, ["team", "department"]);
  const frequencyRaw = pick(raw, ["frequency", "schedule"]);
  const dueHourRaw = pick(raw, ["duehour", "due hour", "hour"]);
  const dueMinuteRaw = pick(raw, ["dueminute", "due minute", "minute"]);
  const assigneeEmail = pick(raw, ["assigneeemail", "assignee email", "doer", "email"]);
  const referencesRaw = pick(raw, ["references", "links", "urls"]);
  const activeRaw = pick(raw, ["isactive", "active", "status"]);

  if (!title) {
    errors.push("Missing title");
  }
  if (!assigneeEmail) {
    errors.push("Missing assigneeEmail");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(assigneeEmail)) {
    errors.push(`Invalid assigneeEmail "${assigneeEmail}"`);
  }

  const team = parseTeam(teamRaw);
  if (team === null) {
    errors.push(`Invalid team "${teamRaw}"`);
  }

  const frequency = parseFrequency(frequencyRaw);
  if (frequency === null) {
    errors.push(`Invalid frequency "${frequencyRaw}"`);
  }

  const dueHour = parseNum(dueHourRaw, 18);
  const dueMinute = parseNum(dueMinuteRaw, 0);

  if (Number.isNaN(dueHour) || dueHour < 0 || dueHour > 23) {
    errors.push("Invalid dueHour (0-23)");
  }
  if (Number.isNaN(dueMinute) || dueMinute < 0 || dueMinute > 59) {
    errors.push("Invalid dueMinute (0-59)");
  }

  const data: ChecklistTemplateImportRow = {
    title,
    instructions,
    team: team ?? "GENERAL",
    frequency: frequency ?? "MONTHLY",
    dueHour: Number.isNaN(dueHour) ? 18 : dueHour,
    dueMinute: Number.isNaN(dueMinute) ? 0 : dueMinute,
    assigneeEmail: assigneeEmail.toLowerCase(),
    references: parseReferences(referencesRaw),
    isActive: parseBool(activeRaw),
  };

  return {
    rowNumber,
    data,
    raw,
    valid: errors.length === 0,
    errors,
  };
}

export async function importChecklistTemplates(
  organizationId: string,
  createdById: string,
  rows: ChecklistTemplateImportRow[],
) {
  const members = await prisma.membership.findMany({
    where: { organizationId },
    include: { user: { select: { id: true, email: true } } },
  });
  const emailToUserId = new Map(
    members.map((row) => [row.user.email.toLowerCase(), row.user.id]),
  );

  let created = 0;

  for (const row of rows) {
    const assigneeUserId = emailToUserId.get(row.assigneeEmail);
    if (!assigneeUserId) {
      throw new Error(`No workspace member found for ${row.assigneeEmail}.`);
    }

    const template = await prisma.checklistTemplate.create({
      data: {
        organizationId,
        title: row.title,
        instructions: row.instructions,
        team: row.team,
        frequency: row.frequency,
        dueMonthDay: 1,
        dueWeekday: 1,
        dueMonth: 4,
        anchorDate: row.frequency === "FORTNIGHTLY" ? new Date() : null,
        dueHour: row.dueHour,
        dueMinute: row.dueMinute,
        assigneeUserId,
        createdById,
        isActive: row.isActive,
        references: {
          create: row.references.map((href, index) => ({
            kind: referenceKind(href),
            label: referenceLabel(href),
            href,
            sortOrder: index,
          })),
        },
      },
      include: {
        assignee: { select: { name: true, email: true } },
        references: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (row.isActive) {
      await ensureChecklistOccurrence(template);
    }

    created += 1;
  }

  return { created, total: rows.length };
}
