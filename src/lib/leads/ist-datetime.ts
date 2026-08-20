/**
 * CRM meeting / follow-up times are entered as HTML `datetime-local`
 * (no timezone). Treat wall-clock values as Asia/Kolkata — never as the
 * server's local zone (Vercel is UTC, which shifts IST by +5:30).
 */

const IST_OFFSET_MS = (5 * 60 + 30) * 60_000;

const DATETIME_LOCAL_RE =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Parse `YYYY-MM-DDTHH:mm` (optional seconds) as India Standard Time → Date.
 * Strings that already include `Z` or an offset use native Date parsing.
 */
export function parseDatetimeLocalAsIst(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(DATETIME_LOCAL_RE);
  if (!match) {
    const fallback = new Date(trimmed);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? 0);

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }

  // Interpret components as IST wall time, then convert to UTC instant.
  return new Date(
    Date.UTC(year, month - 1, day, hour, minute, second) - IST_OFFSET_MS,
  );
}

/** Format a Date as `datetime-local` value in Asia/Kolkata. */
export function formatDatetimeLocalIst(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  // en-CA hour can be "24" at midnight in some engines — normalize.
  let hour = get("hour");
  if (hour === "24") hour = "00";

  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}
