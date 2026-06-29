import { prisma } from "@/lib/db";
import { buildSeriesKey } from "@/lib/checklists/schedule";
import {
  checklistFrequencyToAccountsCode,
  formatLastDateLabel,
  type AccountsFreqCode,
} from "@/lib/checklists/accounts-checklist-catalog";

export type AccountsGridDayCell = {
  day: number;
  status: "empty" | "done" | "late" | "due" | "overdue";
  marker?: "M";
};

export type AccountsGridRow = {
  templateId: string;
  accountability: string;
  freq: AccountsFreqCode;
  lastDate: string;
  particular: string;
  occurrenceId: string | null;
  days: AccountsGridDayCell[];
};

export type AccountsChecklistGrid = {
  monthLabel: string;
  week1Label: string;
  week2Label: string;
  rows: AccountsGridRow[];
};

function monthName(date: Date) {
  return date.toLocaleString("en-IN", { month: "long", year: "numeric" });
}

function dayCellStatus(params: {
  day: number;
  month: number;
  year: number;
  dueMonthDay: number | null;
  plannedAt: Date | null;
  actualAt: Date | null;
  status: string;
  now: Date;
}): AccountsGridDayCell {
  const { day, month, year, dueMonthDay, plannedAt, actualAt, status, now } = params;
  const cellDate = new Date(year, month, day, 23, 59, 59);

  if (actualAt) {
    const completedDay = actualAt.getDate();
    const completedMonth = actualAt.getMonth();
    const completedYear = actualAt.getFullYear();
    if (completedDay === day && completedMonth === month && completedYear === year) {
      const onTime = plannedAt ? actualAt.getTime() <= plannedAt.getTime() : true;
      return { day, status: onTime ? "done" : "late", marker: "M" };
    }
  }

  if (dueMonthDay === day && plannedAt) {
    const plannedDay = plannedAt.getDate();
    const plannedMonth = plannedAt.getMonth();
    if (plannedDay === day && plannedMonth === month) {
      if (status === "OVERDUE" || (status === "PENDING" && cellDate < now)) {
        return { day, status: "overdue", marker: "M" };
      }
      if (status === "PENDING") {
        return { day, status: "due", marker: "M" };
      }
    }
  }

  return { day, status: "empty" };
}

export async function getAccountsChecklistGrid(
  organizationId: string,
  referenceDate = new Date(),
): Promise<AccountsChecklistGrid> {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const now = referenceDate;

  const templates = await prisma.checklistTemplate.findMany({
    where: { organizationId, team: "ACCOUNTS", isActive: true },
    include: {
      assignee: { select: { name: true, email: true } },
      occurrences: {
        where: {
          plannedAt: {
            gte: new Date(year, month, 1),
            lt: new Date(year, month + 1, 1),
          },
        },
        orderBy: { plannedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { title: "asc" },
  });

  const rows: AccountsGridRow[] = templates.map((template) => {
    const occurrence = template.occurrences[0] ?? null;
    const freq = checklistFrequencyToAccountsCode(template.frequency);
    const lastDate = formatLastDateLabel(
      template.frequency,
      template.dueMonthDay,
      template.dueMonth,
    );
    const accountability = template.assignee
      ? (template.assignee.name ??
        template.assignee.email.split("@")[0] ??
        "Unassigned")
      : "Unassigned";

    const days: AccountsGridDayCell[] = [];
    for (let day = 1; day <= 14; day += 1) {
      days.push(
        dayCellStatus({
          day,
          month,
          year,
          dueMonthDay: template.dueMonthDay,
          plannedAt: occurrence?.plannedAt ?? null,
          actualAt: occurrence?.actualAt ?? null,
          status: occurrence?.status ?? "PENDING",
          now,
        }),
      );
    }

    return {
      templateId: template.id,
      accountability,
      freq,
      lastDate,
      particular: template.title,
      occurrenceId: occurrence?.id ?? null,
      days,
    };
  });

  return {
    monthLabel: monthName(referenceDate),
    week1Label: "Week 1",
    week2Label: "Week 2",
    rows,
  };
}

export async function countAccountsTemplates(organizationId: string) {
  return prisma.checklistTemplate.count({
    where: { organizationId, team: "ACCOUNTS", isActive: true },
  });
}

export function currentMonthSeriesKey(date = new Date()) {
  return buildSeriesKey(date, "MONTHLY");
}
