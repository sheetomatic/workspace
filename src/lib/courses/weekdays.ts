/** Weekday helpers for flexible 1–2 day training schedules (0=Sun … 6=Sat). */

export const TRAINING_WEEKDAYS = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
] as const;

/** Bookable session start window in Asia/Kolkata (inclusive). */
export const TRAINING_BOOKING_WINDOW = {
  startIst: "08:30",
  endIst: "18:00",
  label: "8:30 AM – 6:00 PM IST",
} as const;

/** Allowed session lengths in minutes (includes 3-hour sessions). */
export const TRAINING_SESSION_DURATION_OPTIONS = [60, 90, 120, 180, 240] as const;

export type TrainingWeekdayValue = (typeof TRAINING_WEEKDAYS)[number]["value"];

export function weekdayLabel(day: number): string {
  return TRAINING_WEEKDAYS.find((item) => item.value === day)?.label ?? `Day ${day}`;
}

export function weekdayShort(day: number): string {
  return TRAINING_WEEKDAYS.find((item) => item.value === day)?.short ?? String(day);
}

export function parseWeekdaysCsv(raw: string | null | undefined): number[] {
  if (!raw?.trim()) return [];
  const days = raw
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  return [...new Set(days)].sort((a, b) => a - b);
}

export function formatWeekdaysCsv(days: number[]): string {
  return [...new Set(days)]
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
    .sort((a, b) => a - b)
    .join(",");
}

export function weekdaysLabel(days: number[]): string {
  if (days.length === 0) return "Custom days";
  if (days.length === 1) return weekdayLabel(days[0]!);
  return days.map(weekdayLabel).join(" + ");
}

/**
 * Build a sorted unique weekday list for training.
 * Day 2 may be empty / "none" for a single-day schedule.
 */
export function normalizeTrainingWeekdays(
  dayOneRaw: unknown,
  dayTwoRaw: unknown,
): { ok: true; days: number[]; csv: string } | { ok: false; message: string } {
  const dayOne = Number.parseInt(String(dayOneRaw ?? ""), 10);
  if (!Number.isInteger(dayOne) || dayOne < 0 || dayOne > 6) {
    return { ok: false, message: "Choose a weekday." };
  }

  const dayTwoStr = String(dayTwoRaw ?? "").trim();
  if (
    dayTwoStr === "" ||
    dayTwoStr === "none" ||
    dayTwoStr.toLowerCase() === "single"
  ) {
    return { ok: true, days: [dayOne], csv: formatWeekdaysCsv([dayOne]) };
  }

  const dayTwo = Number.parseInt(dayTwoStr, 10);
  if (!Number.isInteger(dayTwo) || dayTwo < 0 || dayTwo > 6) {
    return { ok: false, message: "Choose a valid second weekday, or Single day only." };
  }
  if (dayOne === dayTwo) {
    return { ok: true, days: [dayOne], csv: formatWeekdaysCsv([dayOne]) };
  }
  const days = [dayOne, dayTwo].sort((a, b) => a - b);
  return { ok: true, days, csv: formatWeekdaysCsv(days) };
}

/** @deprecated Use normalizeTrainingWeekdays — kept for call-site compatibility. */
export function normalizeTwoWeekdays(dayOneRaw: unknown, dayTwoRaw: unknown) {
  return normalizeTrainingWeekdays(dayOneRaw, dayTwoRaw);
}

export function cohortFromWeekdays(days: number[]): "MON_FRI" | "TUE_SAT" | "CUSTOM" {
  const key = formatWeekdaysCsv(days);
  if (key === "1,5") return "MON_FRI";
  if (key === "2,6") return "TUE_SAT";
  return "CUSTOM";
}

export function weekdaysFromCohort(
  cohort: "MON_FRI" | "TUE_SAT" | "CUSTOM",
  weekdaysCsv?: string | null,
): number[] {
  const fromCsv = parseWeekdaysCsv(weekdaysCsv);
  if (fromCsv.length > 0) return fromCsv;
  if (cohort === "MON_FRI") return [1, 5];
  if (cohort === "TUE_SAT") return [2, 6];
  return [];
}

/** Minutes since midnight for HH:mm. */
export function timeIstToMinutes(timeIst: string): number | null {
  const match = String(timeIst ?? "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }
  return hour * 60 + minute;
}

/** True when start time is inside the 8:30 AM–6:00 PM IST bookable window. */
export function isWithinTrainingBookingWindow(timeIst: string): boolean {
  const minutes = timeIstToMinutes(timeIst);
  if (minutes == null) return false;
  const start = timeIstToMinutes(TRAINING_BOOKING_WINDOW.startIst)!;
  const end = timeIstToMinutes(TRAINING_BOOKING_WINDOW.endIst)!;
  return minutes >= start && minutes <= end;
}
