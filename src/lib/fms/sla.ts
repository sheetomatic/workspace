import type { FmsSlaType } from "@prisma/client";
import type { FmsSlaConfig, FmsWorkingDaysConfig } from "@/lib/fms/constants";
import { parseHolidayDates } from "@/lib/fms/constants";

/** India MSME default: Mon-Sat working, Sunday off. Optionally skip Saturday. */
export function isWorkingDay(date: Date, config: FmsWorkingDaysConfig = {}) {
  const dow = date.getDay();
  if (dow === 0) {
    return false;
  }
  if (config.skipSaturday && dow === 6) {
    return false;
  }
  const holidays = parseHolidayDates(config.holidayDates);
  const iso = date.toISOString().slice(0, 10);
  return !holidays.includes(iso);
}

export function addWorkingDays(
  from: Date,
  days: number,
  config: FmsWorkingDaysConfig = {},
) {
  const result = new Date(from);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (isWorkingDay(result, config)) {
      added += 1;
    }
  }
  return result;
}

function nextWorkingDaySameClock(from: Date, config: FmsWorkingDaysConfig) {
  const next = new Date(from.getTime());
  next.setUTCDate(next.getUTCDate() + 1);
  while (!isWorkingDay(next, config)) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next;
}

/** Advance by wall-clock hours, but skip Sundays, optional Saturdays, and holidays. */
export function addWorkingHours(
  from: Date,
  hours: number,
  config: FmsWorkingDaysConfig = {},
) {
  const result = new Date(from.getTime());
  let remainingMs = Math.max(0, hours) * 60 * 60 * 1000;
  const stepMs = 60 * 60 * 1000;

  while (remainingMs > 0) {
    if (!isWorkingDay(result, config)) {
      result.setTime(nextWorkingDaySameClock(result, config).getTime());
      continue;
    }

    const chunk = Math.min(remainingMs, stepMs);
    const next = new Date(result.getTime() + chunk);
    if (
      !isWorkingDay(next, config) &&
      next.toISOString().slice(0, 10) !== result.toISOString().slice(0, 10)
    ) {
      result.setTime(nextWorkingDaySameClock(next, config).getTime());
      remainingMs -= chunk;
      continue;
    }

    result.setTime(next.getTime());
    remainingMs -= chunk;
  }

  return result;
}

export function computePlannedAt(
  slaType: FmsSlaType,
  slaConfig: FmsSlaConfig,
  anchor: Date,
  workingDays: FmsWorkingDaysConfig = {},
): Date | null {
  if (slaType === "NONE") {
    return null;
  }

  if (slaType === "TAT_CALENDAR_DAYS") {
    const days = slaConfig.days ?? 1;
    const planned = addWorkingDays(anchor, days, workingDays);
    planned.setHours(anchor.getHours(), anchor.getMinutes(), 0, 0);
    return planned;
  }

  if (slaType === "TAT_WORKING_HOURS") {
    const hours = slaConfig.hours ?? 24;
    return addWorkingHours(anchor, hours, workingDays);
  }

  if (slaType === "SPECIFIC_TIME") {
    const daysAfter = slaConfig.days ?? 0;
    const planned = addWorkingDays(anchor, daysAfter, workingDays);
    const hour = slaConfig.atHour ?? 18;
    const minute = slaConfig.atMinute ?? 0;
    planned.setHours(hour, minute, 0, 0);
    return planned;
  }

  if (slaType === "LEAD_TIME_MINUS") {
    const minus = slaConfig.minusDays ?? 0;
    const planned = new Date(anchor);
    planned.setDate(planned.getDate() - minus);
    return planned;
  }

  return null;
}

export function computeDelayMinutes(
  plannedAt: Date | null,
  actualAt: Date | null,
  now = new Date(),
): number | null {
  if (!plannedAt) {
    return null;
  }
  const compare = actualAt ?? now;
  if (compare <= plannedAt) {
    return actualAt && actualAt > plannedAt
      ? Math.round((actualAt.getTime() - plannedAt.getTime()) / 60000)
      : null;
  }
  return Math.round((compare.getTime() - plannedAt.getTime()) / 60000);
}
