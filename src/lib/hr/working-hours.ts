/** Parse "HH:MM" or "H:MM" to minutes from midnight. Returns null if invalid. */
export function parseTimeToMinutes(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Minutes from midnight in Asia/Kolkata for a Date. */
export function istMinutesOfDay(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

/** Supports overnight shifts (end <= start) by wrapping past midnight. */
export function dailyWorkingHours(
  workStartTime: string,
  workEndTime: string,
): number {
  const start = parseTimeToMinutes(workStartTime) ?? 9 * 60 + 30;
  const end = parseTimeToMinutes(workEndTime) ?? 18 * 60 + 30;
  const diffMins = end > start ? end - start : end + 24 * 60 - start;
  const diff = diffMins / 60;
  return diff > 0 ? diff : 9;
}

export function isOvernightShift(workStartTime: string, workEndTime: string): boolean {
  const start = parseTimeToMinutes(workStartTime);
  const end = parseTimeToMinutes(workEndTime);
  if (start == null || end == null) return false;
  return end <= start;
}

export function isCheckInLate(params: {
  checkInAt: Date;
  workStartTime: string;
  lateGraceMinutes?: number;
}): boolean {
  const start = parseTimeToMinutes(params.workStartTime);
  if (start == null) return false;
  const grace = params.lateGraceMinutes ?? 15;
  const checkInMins = istMinutesOfDay(params.checkInAt);
  // Day shift / evening start: late after start+grace.
  // Overnight: late only in the start-side window (e.g. after 22:15 for 22:00 start).
  return checkInMins > start + grace;
}

/**
 * Hours after workEndTime (IST), floored at 0, rounded to 0.25h.
 * Overnight: OT only in the morning window after end and before next start.
 */
export function computeOtHoursFromCheckout(params: {
  checkOutAt: Date;
  workStartTime: string;
  workEndTime: string;
}): number {
  const start = parseTimeToMinutes(params.workStartTime);
  const end = parseTimeToMinutes(params.workEndTime);
  if (end == null) return 0;
  const outMins = istMinutesOfDay(params.checkOutAt);

  let overtimeMins = 0;
  if (start != null && end <= start) {
    // Overnight: OT if checked out after end (morning) and before start (evening).
    if (outMins > end && outMins < start) {
      overtimeMins = outMins - end;
    }
  } else if (outMins > end) {
    overtimeMins = outMins - end;
  }

  if (overtimeMins <= 0) return 0;
  return Math.round((overtimeMins / 60) * 4) / 4;
}

/** Payable day fraction for SHORT_LEAVE given policy hours and daily span. */
export function shortLeavePayableFraction(params: {
  shortLeaveHours: number;
  workStartTime: string;
  workEndTime: string;
}): number {
  const dayHours = dailyWorkingHours(params.workStartTime, params.workEndTime);
  const deducted = Math.max(0, Math.min(params.shortLeaveHours, dayHours));
  const fraction = 1 - deducted / dayHours;
  return Math.round(Math.max(0, Math.min(1, fraction)) * 100) / 100;
}

/**
 * Hourly rate for OT: explicit profile rate, else monthlySalary / (26 * dailyHours).
 */
export function resolveHourlyRate(params: {
  hourlyRate: number | null | undefined;
  monthlySalary: number | null | undefined;
  workStartTime: string;
  workEndTime: string;
}): number {
  if (params.hourlyRate != null && params.hourlyRate > 0) {
    return params.hourlyRate;
  }
  const salary = params.monthlySalary ?? 0;
  if (salary <= 0) return 0;
  const dayHours = dailyWorkingHours(params.workStartTime, params.workEndTime);
  return salary / (26 * dayHours);
}
