const IST = "Asia/Kolkata";

const DUE_TIME_RE =
  /\b(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)\b|\d{1,2}\s*(?:am|pm)\b|\d{1,2}[:.]\d{2}\b|noon|midnight|morning|afternoon|evening|night|o'?clock)\b/i;

const DUE_DATE_RE =
  /\b(?:today|tonight|tomorrow|tmrw|tmw|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next\s+week|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\b/i;

export function instructionSpecifiesDueTime(text: string) {
  return DUE_TIME_RE.test(text);
}

export function instructionSpecifiesDueDate(text: string) {
  return DUE_DATE_RE.test(text);
}

/** Parse a model datetime as IST when no offset is present (avoids 06:00Z → 11:30 AM). */
export function parseIstDateTime(raw: string | null | undefined): Date | null {
  if (!raw?.trim()) {
    return null;
  }
  const trimmed = raw.trim();
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (!match) {
    const fallback = new Date(trimmed);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  const [, year, month, day, hour = "17", minute = "00", second = "00"] = match;
  const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}+05:30`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function istDateTimeLocalValue(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${read("year")}-${read("month")}-${read("day")}T${read("hour")}:${read("minute")}`;
}

export function istYmd(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(date);
}
