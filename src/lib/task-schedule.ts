import type { TaskFrequency } from "@prisma/client";

export const TASK_FREQUENCY_LABELS: Record<TaskFrequency, string> = {
  ONCE: "One time",
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
};

export const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
] as const;

export type RecurrenceOptions = {
  weeklyDays?: number[];
  monthDay?: number;
};

export function isRecurringFrequency(frequency: TaskFrequency) {
  return frequency !== "ONCE";
}

export function parseWeeklyDaysFromForm(raw: string | null | undefined): number[] {
  if (!raw?.trim()) {
    return [];
  }
  const days = raw
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((day) => day >= 0 && day <= 6);
  return [...new Set(days)].sort((a, b) => a - b);
}

export function serializeWeeklyDays(days: number[]): string {
  return [...new Set(days.filter((d) => d >= 0 && d <= 6))]
    .sort((a, b) => a - b)
    .join(",");
}

export function parseMonthDayFromForm(
  raw: string | null | undefined,
  fallbackFromDate?: Date,
): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (parsed >= 1 && parsed <= 31) {
    return parsed;
  }
  if (fallbackFromDate) {
    return fallbackFromDate.getDate();
  }
  return 1;
}

export function defaultWeeklyDaysFromDue(due: Date): number[] {
  return [due.getDay()];
}

function copyTime(target: Date, source: Date) {
  target.setHours(
    source.getHours(),
    source.getMinutes(),
    source.getSeconds(),
    source.getMilliseconds(),
  );
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function setMonthDay(date: Date, monthDay: number) {
  const maxDay = daysInMonth(date.getFullYear(), date.getMonth());
  date.setDate(Math.min(monthDay, maxDay));
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function computeNextWeeklyDue(from: Date, weeklyDays: number[]): Date | null {
  if (weeklyDays.length === 0) {
    return null;
  }
  const sorted = [...weeklyDays].sort((a, b) => a - b);
  const fromDay = from.getDay();

  for (const day of sorted) {
    if (day > fromDay) {
      const next = new Date(from);
      next.setDate(from.getDate() + (day - fromDay));
      return next;
    }
  }

  const first = sorted[0];
  const next = new Date(from);
  next.setDate(from.getDate() + (7 - fromDay + first));
  return next;
}

export function alignDueToWeeklyPattern(dueAt: Date, weeklyDays: number[]): Date {
  const sorted = [...weeklyDays].sort((a, b) => a - b);
  const aligned = new Date(dueAt);
  const today = new Date();
  const dueDay = aligned.getDay();

  const candidateDays: number[] = [];
  for (const day of sorted) {
    const delta = (day - dueDay + 7) % 7;
    const candidate = addDays(aligned, delta);
    copyTime(candidate, aligned);
    if (candidate.getTime() >= today.getTime() - 60_000) {
      candidateDays.push(candidate.getTime());
    }
  }

  if (candidateDays.length === 0) {
    const first = sorted[0];
    const delta = (first - dueDay + 7) % 7 || 7;
    const next = addDays(aligned, delta);
    copyTime(next, aligned);
    return next;
  }

  return new Date(Math.min(...candidateDays));
}

export function alignDueToMonthlyPattern(dueAt: Date, monthDay: number): Date {
  const aligned = new Date(dueAt);
  copyTime(aligned, dueAt);
  setMonthDay(aligned, monthDay);

  const now = new Date();
  if (aligned.getTime() < now.getTime()) {
    aligned.setMonth(aligned.getMonth() + 1);
    setMonthDay(aligned, monthDay);
  }
  return aligned;
}

export function computeNextDueAt(
  frequency: TaskFrequency,
  from: Date,
  options?: RecurrenceOptions,
): Date | null {
  if (frequency === "ONCE") {
    return null;
  }

  const next = new Date(from);

  switch (frequency) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      return next;
    case "WEEKLY": {
      const weeklyDays =
        options?.weeklyDays && options.weeklyDays.length > 0
          ? options.weeklyDays
          : [from.getDay()];
      return computeNextWeeklyDue(from, weeklyDays);
    }
    case "MONTHLY": {
      const monthDay = options?.monthDay ?? from.getDate();
      next.setMonth(next.getMonth() + 1);
      setMonthDay(next, monthDay);
      return next;
    }
    default:
      return null;
  }
}

export function alignDueAtForRecurrence(
  dueAt: Date,
  frequency: TaskFrequency,
  options: RecurrenceOptions,
): Date {
  if (frequency === "WEEKLY" && options.weeklyDays?.length) {
    return alignDueToWeeklyPattern(dueAt, options.weeklyDays);
  }
  if (frequency === "MONTHLY") {
    const monthDay = options.monthDay ?? dueAt.getDate();
    return alignDueToMonthlyPattern(dueAt, monthDay);
  }
  return dueAt;
}

export function formatRecurrenceSummary(
  frequency: TaskFrequency,
  recurrenceWeeklyDays: string | null | undefined,
  recurrenceMonthDay: number | null | undefined,
): string {
  if (frequency === "WEEKLY") {
    const days = parseWeeklyDaysFromForm(recurrenceWeeklyDays);
    if (days.length === 0) {
      return TASK_FREQUENCY_LABELS.WEEKLY;
    }
    const labels = days
      .map((d) => WEEKDAY_OPTIONS.find((w) => w.value === d)?.label ?? "")
      .filter(Boolean);
    return "Weekly - " + labels.join(", ");
  }
  if (frequency === "MONTHLY" && recurrenceMonthDay) {
    return "Monthly - day " + String(recurrenceMonthDay);
  }
  return TASK_FREQUENCY_LABELS[frequency];
}

export function resolveFrequencyFromForm(raw: string): TaskFrequency {
  const values: TaskFrequency[] = ["ONCE", "DAILY", "WEEKLY", "MONTHLY"];
  if (values.includes(raw as TaskFrequency)) {
    return raw as TaskFrequency;
  }
  return "ONCE";
}
