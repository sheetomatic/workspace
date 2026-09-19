import type { ChecklistFrequency, ChecklistTeam } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  CHECKLIST_FREQUENCY_LABELS,
  CHECKLIST_TEAM_LABELS,
} from "@/lib/checklists/constants";
import {
  computeActivePeriodDue,
  type ChecklistDueRule,
} from "@/lib/checklists/schedule";

export type ChecklistPcRow = {
  templateId: string;
  title: string;
  instructions: string | null;
  team: ChecklistTeam;
  teamLabel: string;
  frequency: ChecklistFrequency;
  frequencyLabel: string;
  dueMonthDay: number | null;
  dueWeekday: number | null;
  dueMonth: number | null;
  dueAt: string | null;
  dueDateLabel: string;
  dueRuleLabel: string;
  doerId: string;
  doerLabel: string;
  occurrenceId: string | null;
  occurrenceStatus: string | null;
  overdue: boolean;
  notes: string | null;
  canMarkDone: boolean;
};

export type ChecklistPcRowFilters = {
  due?: string | null;
  date?: string | null;
  doer?: string | null;
  department?: string | null;
};

export type ChecklistListSearch = {
  due?: string;
  date?: string;
  doer?: string;
  dept?: string;
};

export function resolveChecklistListFilters(
  search: ChecklistListSearch,
  defaultTeam: ChecklistTeam,
) {
  return {
    due: search.due?.trim() || undefined,
    date: search.date?.trim() || undefined,
    doer: search.doer?.trim() || undefined,
    department: search.dept?.trim() || defaultTeam,
  };
}

export const CHECKLIST_DEPARTMENT_HREFS: Record<string, string> = {
  ACCOUNTS: "/app/checklists/accounts",
  HR: "/app/checklists/hr",
  MAINTENANCE: "/app/checklists/maintenance",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatChecklistDueRule(template: {
  frequency: string;
  dueMonthDay: number | null;
  dueWeekday: number | null;
}) {
  const freq =
    CHECKLIST_FREQUENCY_LABELS[
      template.frequency as keyof typeof CHECKLIST_FREQUENCY_LABELS
    ] ?? template.frequency;
  if (template.frequency === "WEEKLY") {
    return `${freq} · ${WEEKDAYS[template.dueWeekday ?? 1] ?? "Mon"}`;
  }
  if (template.dueMonthDay) {
    return `${freq} · day ${template.dueMonthDay}`;
  }
  return freq;
}

function ownerLabel(name: string | null | undefined, email: string) {
  return name?.trim() || email.split("@")[0];
}

function formatDueDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function startOfWeekMonday(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = day === 0 ? 6 : day - 1;
  next.setDate(next.getDate() - diff);
  return next;
}

function endOfWeekMonday(date: Date) {
  const next = startOfWeekMonday(date);
  next.setDate(next.getDate() + 6);
  return endOfDay(next);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(year, month, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function dueAtDate(row: ChecklistPcRow) {
  return row.dueAt ? new Date(row.dueAt) : null;
}

export function filterChecklistPcRows(
  rows: ChecklistPcRow[],
  filters: ChecklistPcRowFilters,
  now = new Date(),
): ChecklistPcRow[] {
  const department = filters.department?.trim() || "";
  const doer = filters.doer?.trim() || "";
  const dateValue = filters.date?.trim() || "";
  const due = filters.due?.trim() || "";

  return rows.filter((row) => {
    if (department && department !== "all" && row.team !== department) {
      return false;
    }
    if (doer && doer !== "all" && row.doerId !== doer) {
      return false;
    }

    const planned = dueAtDate(row);
    if (dateValue) {
      const picked = parseIsoDate(dateValue);
      if (!picked || !planned) {
        return false;
      }
      return planned >= startOfDay(picked) && planned <= endOfDay(picked);
    }

    if (!due || due === "all") {
      return true;
    }
    if (due === "overdue") {
      return row.overdue;
    }
    if (!planned) {
      return false;
    }
    if (due === "today") {
      return planned >= startOfDay(now) && planned <= endOfDay(now);
    }
    if (due === "this_week") {
      return planned >= startOfWeekMonday(now) && planned <= endOfWeekMonday(now);
    }
    if (due === "this_month") {
      return planned >= startOfMonth(now) && planned <= endOfMonth(now);
    }
    const picked = parseIsoDate(due);
    if (picked) {
      return planned >= startOfDay(picked) && planned <= endOfDay(picked);
    }
    return true;
  });
}

export function checklistPcDoerOptions(rows: ChecklistPcRow[]) {
  const seen = new Map<string, string>();
  for (const row of rows) {
    if (!seen.has(row.doerId)) {
      seen.set(row.doerId, row.doerLabel);
    }
  }
  return Array.from(seen.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listChecklistPcRows(
  organizationId: string,
  currentUserId: string,
): Promise<ChecklistPcRow[]> {
  const templates = await prisma.checklistTemplate.findMany({
    where: { organizationId, isActive: true },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      occurrences: {
        where: { status: { in: ["PENDING", "OVERDUE"] } },
        orderBy: { plannedAt: "asc" },
        take: 1,
        select: {
          id: true,
          plannedAt: true,
          status: true,
          notes: true,
          assigneeUserId: true,
        },
      },
    },
    orderBy: [{ team: "asc" }, { title: "asc" }],
  });

  const now = new Date();

  return templates.map((template) => {
    const open = template.occurrences[0] ?? null;
    const rule: ChecklistDueRule = {
      frequency: template.frequency,
      dueMonthDay: template.dueMonthDay,
      dueWeekday: template.dueWeekday,
      dueMonth: template.dueMonth,
      anchorDate: template.anchorDate,
      dueHour: template.dueHour,
      dueMinute: template.dueMinute,
    };
    const dueAt = open?.plannedAt ?? computeActivePeriodDue(rule, now);
    const overdue = open
      ? open.status === "OVERDUE" || dueAt.getTime() < now.getTime()
      : dueAt.getTime() < now.getTime();
    const doerId = open?.assigneeUserId ?? template.assigneeUserId;

    return {
      templateId: template.id,
      title: template.title,
      instructions: template.instructions,
      team: template.team,
      teamLabel: CHECKLIST_TEAM_LABELS[template.team] ?? template.team,
      frequency: template.frequency,
      frequencyLabel:
        CHECKLIST_FREQUENCY_LABELS[template.frequency] ?? template.frequency,
      dueMonthDay: template.dueMonthDay,
      dueWeekday: template.dueWeekday,
      dueMonth: template.dueMonth,
      dueAt: dueAt.toISOString(),
      dueDateLabel: formatDueDate(dueAt),
      dueRuleLabel: formatChecklistDueRule(template),
      doerId,
      doerLabel: ownerLabel(template.assignee.name, template.assignee.email),
      occurrenceId: open?.id ?? null,
      occurrenceStatus: open?.status ?? null,
      overdue,
      notes: open?.notes ?? null,
      canMarkDone: Boolean(open && open.assigneeUserId === currentUserId),
    };
  });
}
