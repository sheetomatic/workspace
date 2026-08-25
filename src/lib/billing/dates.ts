const MS_DAY = 86_400_000;

export function utcYmd(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function startOfUtcDay(date: Date) {
  return new Date(utcYmd(date));
}

/** Whole calendar days from a → b (UTC dates). Negative if b is before a. */
export function daysBetweenUtc(from: Date, to: Date) {
  return Math.round((utcYmd(to) - utcYmd(from)) / MS_DAY);
}

export function addUtcDays(date: Date, days: number) {
  return new Date(utcYmd(date) + days * MS_DAY);
}

export function addUtcMonths(date: Date, months: number) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay)));
}

/** Service period: [start, start + 1 month). End is the last inclusive day. */
export function monthlyPeriodFrom(start: Date) {
  const periodStart = startOfUtcDay(start);
  const nextStart = addUtcMonths(periodStart, 1);
  const periodEnd = addUtcDays(nextStart, -1);
  return { periodStart, periodEnd, dueAt: periodEnd };
}

export function periodLengthDays(periodStart: Date, periodEnd: Date) {
  return Math.max(1, daysBetweenUtc(periodStart, periodEnd) + 1);
}

export function remainingDaysInclusive(from: Date, periodEnd: Date) {
  return Math.max(0, daysBetweenUtc(startOfUtcDay(from), periodEnd) + 1);
}

/** True after the calendar day of dueAt (they keep access through the due date). */
export function isPastDueDate(dueAt: Date, now = new Date()) {
  return utcYmd(now) > utcYmd(dueAt);
}

export function daysUntilDue(dueAt: Date, now = new Date()) {
  return daysBetweenUtc(startOfUtcDay(now), dueAt);
}

const REMINDER_DAYS = [7, 3, 1, 0] as const;

export function shouldSendReminder(
  daysLeft: number,
  alreadyOn: Date | null,
  now: Date,
) {
  if (!REMINDER_DAYS.includes(daysLeft as (typeof REMINDER_DAYS)[number])) {
    return false;
  }
  if (!alreadyOn) return true;
  return alreadyOn.toISOString().slice(0, 10) !== now.toISOString().slice(0, 10);
}

export function formatBillingDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
