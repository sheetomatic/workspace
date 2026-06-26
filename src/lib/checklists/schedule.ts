import type { ChecklistFrequency } from "@prisma/client";

export type ChecklistDueRule = {
  frequency: ChecklistFrequency;
  dueMonthDay?: number | null;
  dueWeekday?: number | null;
  dueMonth?: number | null;
  anchorDate?: Date | null;
  dueHour?: number;
  dueMinute?: number;
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function withDueTime(date: Date, dueHour: number, dueMinute: number) {
  const next = new Date(date);
  next.setHours(dueHour, dueMinute, 0, 0);
  return next;
}

export function buildSeriesKey(date: Date, frequency: ChecklistFrequency) {
  if (frequency === "WEEKLY" || frequency === "FORTNIGHTLY") {
    const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = utc.getUTCDay() || 7;
    utc.setUTCDate(utc.getUTCDate() + 4 - day);
    const year = utc.getUTCFullYear();
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${year}-W${pad2(week)}`;
  }
  if (frequency === "MONTHLY") {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
  }
  if (frequency === "QUARTERLY") {
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    return `${date.getFullYear()}-Q${quarter}`;
  }
  if (frequency === "HALF_YEARLY") {
    const half = date.getMonth() < 6 ? 1 : 2;
    return `${date.getFullYear()}-H${half}`;
  }
  return String(date.getFullYear());
}

function nextWeekly(from: Date, weekday: number, dueHour: number, dueMinute: number) {
  const next = new Date(from);
  next.setHours(dueHour, dueMinute, 0, 0);
  const current = next.getDay();
  let delta = (weekday - current + 7) % 7;
  if (delta === 0 && next.getTime() <= from.getTime()) {
    delta = 7;
  }
  next.setDate(next.getDate() + delta);
  return next;
}

function nextFortnightly(from: Date, anchor: Date, dueHour: number, dueMinute: number) {
  const anchorStart = withDueTime(anchor, dueHour, dueMinute);
  let next = new Date(anchorStart);
  while (next.getTime() <= from.getTime()) {
    next = new Date(next.getTime() + 14 * 86400000);
  }
  return next;
}

function nextMonthly(from: Date, monthDay: number, dueHour: number, dueMinute: number) {
  const cursor = new Date(from);
  cursor.setDate(1);
  for (let i = 0; i < 24; i += 1) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const day = Math.min(monthDay, daysInMonth(year, month));
    const candidate = withDueTime(new Date(year, month, day), dueHour, dueMinute);
    if (candidate.getTime() > from.getTime()) {
      return candidate;
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return withDueTime(from, dueHour, dueMinute);
}

function nextOnMonths(
  from: Date,
  monthDay: number,
  months: number[],
  dueHour: number,
  dueMinute: number,
) {
  const sorted = [...months].sort((a, b) => a - b);
  const cursor = new Date(from);
  cursor.setDate(1);
  for (let i = 0; i < 48; i += 1) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    if (sorted.includes(month)) {
      const day = Math.min(monthDay, daysInMonth(year, month));
      const candidate = withDueTime(new Date(year, month, day), dueHour, dueMinute);
      if (candidate.getTime() > from.getTime()) {
        return candidate;
      }
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return withDueTime(from, dueHour, dueMinute);
}

export function computeNextChecklistDue(rule: ChecklistDueRule, from: Date = new Date()) {
  const dueHour = rule.dueHour ?? 18;
  const dueMinute = rule.dueMinute ?? 0;

  switch (rule.frequency) {
    case "WEEKLY":
      return nextWeekly(from, rule.dueWeekday ?? 1, dueHour, dueMinute);
    case "FORTNIGHTLY":
      return nextFortnightly(from, rule.anchorDate ?? from, dueHour, dueMinute);
    case "MONTHLY":
      return nextMonthly(from, rule.dueMonthDay ?? 1, dueHour, dueMinute);
    case "QUARTERLY":
      return nextOnMonths(from, rule.dueMonthDay ?? 1, [0, 3, 6, 9], dueHour, dueMinute);
    case "HALF_YEARLY":
      return nextOnMonths(from, rule.dueMonthDay ?? 1, [3, 9], dueHour, dueMinute);
    case "YEARLY":
      return nextOnMonths(from, rule.dueMonthDay ?? 1, [(rule.dueMonth ?? 4) - 1], dueHour, dueMinute);
    default:
      return withDueTime(from, dueHour, dueMinute);
  }
}

export function computeChecklistDelayMinutes(
  plannedAt: Date,
  actualAt: Date | null,
  status: "PENDING" | "DONE" | "OVERDUE",
) {
  if (status === "DONE" && actualAt) {
    const diff = actualAt.getTime() - plannedAt.getTime();
    return diff > 0 ? Math.round(diff / 60000) : 0;
  }
  if (status === "OVERDUE" || (status === "PENDING" && Date.now() > plannedAt.getTime())) {
    return Math.round((Date.now() - plannedAt.getTime()) / 60000);
  }
  return null;
}

/** Due date for the active cycle (may already be past = overdue). */
export function computeActivePeriodDue(rule: ChecklistDueRule, now: Date = new Date()) {
  const dueHour = rule.dueHour ?? 18;
  const dueMinute = rule.dueMinute ?? 0;

  if (rule.frequency === "WEEKLY") {
    const weekday = rule.dueWeekday ?? 1;
    const cursor = new Date(now);
    const delta = (weekday - cursor.getDay() + 7) % 7;
    cursor.setDate(cursor.getDate() + delta);
    return withDueTime(cursor, dueHour, dueMinute);
  }

  if (rule.frequency === "MONTHLY") {
    const monthDay = rule.dueMonthDay ?? 1;
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = Math.min(monthDay, daysInMonth(year, month));
    return withDueTime(new Date(year, month, day), dueHour, dueMinute);
  }

  if (rule.frequency === "QUARTERLY") {
    const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
    const monthDay = rule.dueMonthDay ?? 1;
    const day = Math.min(monthDay, daysInMonth(now.getFullYear(), quarterMonth));
    return withDueTime(new Date(now.getFullYear(), quarterMonth, day), dueHour, dueMinute);
  }

  if (rule.frequency === "HALF_YEARLY") {
    const halfMonth = now.getMonth() < 6 ? 3 : 9;
    const monthDay = rule.dueMonthDay ?? 1;
    const day = Math.min(monthDay, daysInMonth(now.getFullYear(), halfMonth));
    return withDueTime(new Date(now.getFullYear(), halfMonth, day), dueHour, dueMinute);
  }

  if (rule.frequency === "YEARLY") {
    const month = (rule.dueMonth ?? 4) - 1;
    const monthDay = rule.dueMonthDay ?? 1;
    const day = Math.min(monthDay, daysInMonth(now.getFullYear(), month));
    return withDueTime(new Date(now.getFullYear(), month, day), dueHour, dueMinute);
  }

  if (rule.frequency === "FORTNIGHTLY" && rule.anchorDate) {
    const anchor = withDueTime(rule.anchorDate, dueHour, dueMinute);
    let cursor = new Date(anchor);
    while (cursor.getTime() + 14 * 86400000 <= now.getTime()) {
      cursor = new Date(cursor.getTime() + 14 * 86400000);
    }
    return cursor;
  }

  return computeNextChecklistDue(rule, now);
}
