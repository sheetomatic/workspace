import type { ChecklistFrequency, ChecklistTeam } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  buildSeriesKey,
  computeActivePeriodDue,
  computeChecklistDelayMinutes,
  computeNextChecklistDue,
  type ChecklistDueRule,
} from "@/lib/checklists/schedule";

type TemplateRow = {
  id: string;
  organizationId: string;
  title: string;
  instructions: string | null;
  team: ChecklistTeam;
  frequency: ChecklistFrequency;
  dueMonthDay: number | null;
  dueWeekday: number | null;
  dueMonth: number | null;
  anchorDate: Date | null;
  dueHour: number;
  dueMinute: number;
  assigneeUserId: string;
  isActive: boolean;
  remindViaEmail: boolean;
  assignee: { name: string | null; email: string };
  references: Array<{
    id: string;
    kind: string;
    label: string;
    href: string;
    note: string | null;
  }>;
};

const templateInclude = {
  assignee: { select: { name: true, email: true } },
  references: { orderBy: { sortOrder: "asc" as const } },
};

export function templateDueRule(template: TemplateRow): ChecklistDueRule {
  return {
    frequency: template.frequency,
    dueMonthDay: template.dueMonthDay,
    dueWeekday: template.dueWeekday,
    dueMonth: template.dueMonth,
    anchorDate: template.anchorDate,
    dueHour: template.dueHour,
    dueMinute: template.dueMinute,
  };
}

export async function listChecklistTemplates(organizationId: string) {
  return prisma.checklistTemplate.findMany({
    where: { organizationId, isActive: true },
    include: {
      ...templateInclude,
      _count: { select: { occurrences: true } },
    },
    orderBy: [{ team: "asc" }, { title: "asc" }],
  });
}

export async function listMyChecklistOccurrences(
  organizationId: string,
  assigneeUserId: string,
  filter: "open" | "all" = "open",
) {
  const now = new Date();
  return prisma.checklistOccurrence.findMany({
    where: {
      organizationId,
      assigneeUserId,
      ...(filter === "open"
        ? { status: { in: ["PENDING", "OVERDUE"] } }
        : {}),
    },
    include: {
      template: {
        include: { references: { orderBy: { sortOrder: "asc" } } },
      },
    },
    orderBy: [{ status: "desc" }, { plannedAt: "asc" }],
    take: 100,
  });
}

export async function listOrgOpenChecklistOccurrences(organizationId: string) {
  return prisma.checklistOccurrence.findMany({
    where: {
      organizationId,
      status: { in: ["PENDING", "OVERDUE"] },
    },
    include: {
      template: { select: { title: true, team: true } },
      assignee: { select: { name: true, email: true } },
    },
    orderBy: [{ status: "desc" }, { plannedAt: "asc" }],
    take: 100,
  });
}

export async function getChecklistOccurrence(
  occurrenceId: string,
  organizationId: string,
) {
  return prisma.checklistOccurrence.findFirst({
    where: { id: occurrenceId, organizationId },
    include: {
      template: { include: { references: { orderBy: { sortOrder: "asc" } } } },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function ensureChecklistOccurrence(template: TemplateRow) {
  const now = new Date();
  const rule = templateDueRule(template);
  const plannedAt = computeActivePeriodDue(rule, now);
  const seriesKey = buildSeriesKey(plannedAt, template.frequency);

  const existing = await prisma.checklistOccurrence.findUnique({
    where: {
      templateId_seriesKey: {
        templateId: template.id,
        seriesKey,
      },
    },
  });

  if (existing) {
    return existing;
  }

  const status = plannedAt.getTime() < now.getTime() ? "OVERDUE" : "PENDING";

  return prisma.checklistOccurrence.create({
    data: {
      organizationId: template.organizationId,
      templateId: template.id,
      assigneeUserId: template.assigneeUserId,
      seriesKey,
      plannedAt,
      status,
      delayMinutes:
        status === "OVERDUE"
          ? computeChecklistDelayMinutes(plannedAt, null, "OVERDUE")
          : null,
    },
  });
}

export async function ensureNextChecklistOccurrence(template: TemplateRow, after: Date) {
  const rule = templateDueRule(template);
  const plannedAt = computeNextChecklistDue(rule, after);
  const seriesKey = buildSeriesKey(plannedAt, template.frequency);

  const existing = await prisma.checklistOccurrence.findUnique({
    where: {
      templateId_seriesKey: { templateId: template.id, seriesKey },
    },
  });
  if (existing) {
    return existing;
  }

  return prisma.checklistOccurrence.create({
    data: {
      organizationId: template.organizationId,
      templateId: template.id,
      assigneeUserId: template.assigneeUserId,
      seriesKey,
      plannedAt,
      status: "PENDING",
    },
  });
}

export async function syncChecklistOccurrenceStatuses(organizationId?: string) {
  const now = new Date();
  const open = await prisma.checklistOccurrence.findMany({
    where: {
      ...(organizationId ? { organizationId } : {}),
      status: { in: ["PENDING", "OVERDUE"] },
      plannedAt: { lt: now },
    },
    take: 500,
  });

  for (const row of open) {
    await prisma.checklistOccurrence.update({
      where: { id: row.id },
      data: {
        status: "OVERDUE",
        delayMinutes: computeChecklistDelayMinutes(row.plannedAt, row.actualAt, "OVERDUE"),
      },
    });
  }

  return open.length;
}

export async function generateChecklistOccurrences(organizationId?: string) {
  const templates = await prisma.checklistTemplate.findMany({
    where: {
      isActive: true,
      ...(organizationId ? { organizationId } : {}),
    },
    include: templateInclude,
  });

  let created = 0;
  for (const template of templates) {
    const before = await prisma.checklistOccurrence.count({
      where: { templateId: template.id },
    });
    await ensureChecklistOccurrence(template);
    const after = await prisma.checklistOccurrence.count({
      where: { templateId: template.id },
    });
    if (after > before) {
      created += 1;
    }
  }

  return { templates: templates.length, created };
}

export async function listChecklistOccurrencesForMis(
  organizationId: string,
  range?: { start: Date; end: Date },
) {
  return prisma.checklistOccurrence.findMany({
    where: {
      organizationId,
      ...(range
        ? {
            plannedAt: { gte: range.start, lte: range.end },
          }
        : {}),
    },
    include: {
      template: { select: { title: true, team: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
    take: 500,
  });
}

export async function listChecklistReminderCandidates() {
  return prisma.checklistOccurrence.findMany({
    where: {
      status: { in: ["PENDING", "OVERDUE"] },
      emailReminderSentAt: null,
      template: { remindViaEmail: true, isActive: true },
    },
    include: {
      template: { select: { title: true, team: true, frequency: true } },
      assignee: { select: { name: true, email: true } },
      organization: { select: { name: true, slug: true } },
    },
    take: 100,
  });
}
