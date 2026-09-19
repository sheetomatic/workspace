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

/**
 * Calendar days of unpaid grace after the renewal/due date before the workspace
 * is put on hold. Clients keep working through due day + this many days.
 */
export const SUBSCRIPTION_GRACE_DAYS = 1;

/** True after dueAt + grace days — workspace should stop. */
export function isPastGracePeriod(
  dueAt: Date,
  now = new Date(),
  graceDays = SUBSCRIPTION_GRACE_DAYS,
) {
  return utcYmd(now) > utcYmd(addUtcDays(dueAt, graceDays));
}

/** Unpaid after due date but still within the grace calendar day(s). */
export function isInGracePeriod(
  dueAt: Date,
  now = new Date(),
  graceDays = SUBSCRIPTION_GRACE_DAYS,
) {
  return isPastDueDate(dueAt, now) && !isPastGracePeriod(dueAt, now, graceDays);
}

export function daysUntilDue(dueAt: Date, now = new Date()) {
  return daysBetweenUtc(startOfUtcDay(now), dueAt);
}

/** Advance reminders before the due date (due day uses Payment Pending). */
const REMINDER_DAYS = [7, 3, 1] as const;

/** Due today (0), grace day (-1), and first hold day (-2). */
const PAYMENT_PENDING_ALERT_DAYS = [0, -1, -2] as const;

function alreadyRemindedToday(alreadyOn: Date | null, now: Date) {
  if (!alreadyOn) return false;
  return alreadyOn.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
}

export function shouldSendReminder(
  daysLeft: number,
  alreadyOn: Date | null,
  now: Date,
) {
  if (!REMINDER_DAYS.includes(daysLeft as (typeof REMINDER_DAYS)[number])) {
    return false;
  }
  return !alreadyRemindedToday(alreadyOn, now);
}

/** Payment Pending alerts on due day, grace day, and the day access stops. */
export function shouldSendPaymentPendingAlert(
  daysLeft: number,
  alreadyOn: Date | null,
  now: Date,
) {
  if (!(PAYMENT_PENDING_ALERT_DAYS as readonly number[]).includes(daysLeft)) {
    return false;
  }
  return !alreadyRemindedToday(alreadyOn, now);
}

export function formatBillingDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
