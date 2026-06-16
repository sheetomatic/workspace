import type { FmsSlaType } from "@prisma/client";
import type { FmsSlaConfig } from "@/lib/fms/constants";

function addWorkingDays(from: Date, days: number) {
  const result = new Date(from);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0) {
      added += 1;
    }
  }
  return result;
}

export function computePlannedAt(
  slaType: FmsSlaType,
  slaConfig: FmsSlaConfig,
  anchor: Date,
): Date | null {
  if (slaType === "NONE") {
    return null;
  }

  if (slaType === "TAT_CALENDAR_DAYS") {
    const days = slaConfig.days ?? 1;
    const planned = addWorkingDays(anchor, days);
    planned.setHours(anchor.getHours(), anchor.getMinutes(), 0, 0);
    return planned;
  }

  if (slaType === "TAT_WORKING_HOURS") {
    const hours = slaConfig.hours ?? 24;
    return new Date(anchor.getTime() + hours * 60 * 60 * 1000);
  }

  if (slaType === "SPECIFIC_TIME") {
    const daysAfter = slaConfig.days ?? 0;
    const planned = addWorkingDays(anchor, daysAfter);
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
