const IST = "Asia/Kolkata";

export const DEFAULT_DUE_HOUR_IST = 17;
export const DEFAULT_DUE_MINUTE_IST = 0;

const DUE_TIME_RE =
  /\b(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)\b|\d{1,2}\s*(?:am|pm)\b|\d{1,2}[:.]\d{2}\b|\d{1,2}\s*baje\b|noon|midnight|morning|afternoon|evening|night|o'?clock|subah|dopahar|shaam|raat)\b/i;

const RELATIVE_DATE_RE =
  /\b(?:today|tonight|tomorrow|tmrw|tmw|aaj|kal|parso|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next\s+week)\b/i;

const NUMERIC_DATE_RE = /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/;

const MONTH_TO_NUM: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sept: 9,
  sep: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

const MONTH_ALT = Object.keys(MONTH_TO_NUM)
  .sort((a, b) => b.length - a.length)
  .join("|");

const DAY_MONTH_RE = new RegExp(
  String.raw`\b(\d{1,2})(?:st|nd|rd|th)?(?:\s+of)?\s+(${MONTH_ALT})(?:\s*,?\s*(\d{4}))?\b`,
  "i",
);

const MONTH_DAY_RE = new RegExp(
  String.raw`\b(${MONTH_ALT})\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?\b`,
  "i",
);

const WEEKDAY_TO_NUM: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function instructionSpecifiesDueTime(text: string) {
  return DUE_TIME_RE.test(text);
}

export function instructionSpecifiesDueDate(text: string) {
  return (
    RELATIVE_DATE_RE.test(text) ||
    NUMERIC_DATE_RE.test(text) ||
    DAY_MONTH_RE.test(text) ||
    MONTH_DAY_RE.test(text)
  );
}

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

function istParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return {
    year: Number(read("year")),
    month: Number(read("month")),
    day: Number(read("day")),
    weekday: (read("weekday") || "Sunday").toLowerCase(),
  };
}

export function atIst(
  year: number,
  month: number,
  day: number,
  hour = DEFAULT_DUE_HOUR_IST,
  minute = DEFAULT_DUE_MINUTE_IST,
): Date | null {
  const iso = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00+05:30`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  if (istYmd(parsed) !== `${year}-${pad(month)}-${pad(day)}`) {
    return null;
  }
  return parsed;
}

export function setIstHourMinute(
  date: Date,
  hour = DEFAULT_DUE_HOUR_IST,
  minute = DEFAULT_DUE_MINUTE_IST,
) {
  const parts = istParts(date);
  return atIst(parts.year, parts.month, parts.day, hour, minute) ?? date;
}

function addIstDays(now: Date, days: number) {
  const parts = istParts(now);
  const utc = Date.UTC(parts.year, parts.month - 1, parts.day + days);
  const shifted = new Date(utc);
  return atIst(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
  );
}

function pickYear(month: number, day: number, year: number | null, now: Date) {
  if (year && year >= 2020 && year <= 2100) {
    return year;
  }
  const today = istParts(now);
  const thisYear = atIst(today.year, month, day);
  if (!thisYear) {
    return today.year;
  }
  if (thisYear.getTime() < now.getTime() - 12 * 60 * 60 * 1000) {
    return today.year + 1;
  }
  return today.year;
}

function monthNumber(name: string) {
  return MONTH_TO_NUM[name.toLowerCase()] ?? 0;
}

function parseYearToken(raw: string | undefined) {
  if (!raw) {
    return null;
  }
  const year = Number(raw);
  if (year < 100) {
    return 2000 + year;
  }
  return year;
}

export function parseCalendarDateFromInstruction(
  text: string,
  now = new Date(),
): Date | null {
  const dayMonth = text.match(DAY_MONTH_RE);
  if (dayMonth) {
    const day = Number(dayMonth[1]);
    const month = monthNumber(dayMonth[2] ?? "");
    const year = pickYear(month, day, parseYearToken(dayMonth[3]), now);
    const parsed = atIst(year, month, day);
    if (parsed) {
      return parsed;
    }
  }

  const monthDay = text.match(MONTH_DAY_RE);
  if (monthDay) {
    const month = monthNumber(monthDay[1] ?? "");
    const day = Number(monthDay[2]);
    const year = pickYear(month, day, parseYearToken(monthDay[3]), now);
    const parsed = atIst(year, month, day);
    if (parsed) {
      return parsed;
    }
  }

  const numeric = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (numeric) {
    let day = Number(numeric[1]);
    let month = Number(numeric[2]);
    if (month > 12 && day <= 12) {
      const swap = day;
      day = month;
      month = swap;
    }
    const year = pickYear(month, day, parseYearToken(numeric[3]), now);
    const parsed = atIst(year, month, day);
    if (parsed) {
      return parsed;
    }
  }

  const lower = text.toLowerCase();
  if (/\b(today|tonight|aaj)\b/.test(lower)) {
    return addIstDays(now, 0);
  }
  if (/\b(tomorrow|tmrw|tmw|kal)\b/.test(lower)) {
    return addIstDays(now, 1);
  }
  if (/\bparso\b/.test(lower)) {
    return addIstDays(now, 2);
  }
  if (/\bnext\s+week\b/.test(lower)) {
    return addIstDays(now, 7);
  }

  for (const [name, dow] of Object.entries(WEEKDAY_TO_NUM)) {
    if (new RegExp(String.raw`\b${name}\b`, "i").test(text)) {
      const todayDow = WEEKDAY_TO_NUM[istParts(now).weekday] ?? 0;
      let ahead = (dow - todayDow + 7) % 7;
      const todayAtDefault = addIstDays(now, 0);
      if (ahead === 0 && todayAtDefault && todayAtDefault.getTime() < now.getTime()) {
        ahead = 7;
      }
      return addIstDays(now, ahead);
    }
  }

  return null;
}

function inDueRange(parsed: Date, now: Date) {
  const minMs = now.getTime() - 6 * 60 * 60 * 1000;
  const maxMs = now.getTime() + 2 * 365 * 86_400_000;
  return parsed.getTime() >= minMs && parsed.getTime() <= maxMs;
}

/** Resolve a due instant. Date without a clock time becomes 5:00 PM IST. */
export function resolveDueAtIso(
  instruction: string,
  rawIso: string | null | undefined,
  now = new Date(),
): string | null {
  const dateSpecified = instructionSpecifiesDueDate(instruction);
  const timeSpecified = instructionSpecifiesDueTime(instruction);
  if (!dateSpecified && !timeSpecified) {
    return null;
  }

  let parsed =
    typeof rawIso === "string" && rawIso.trim()
      ? parseIstDateTime(rawIso)
      : null;
  if (!parsed || !inDueRange(parsed, now)) {
    parsed = parseCalendarDateFromInstruction(instruction, now);
  }
  if (!parsed) {
    return null;
  }
  if (dateSpecified && !timeSpecified) {
    parsed = setIstHourMinute(parsed);
  }
  if (!inDueRange(parsed, now)) {
    return null;
  }
  return parsed.toISOString();
}

export function defaultDueIso(now = new Date()) {
  const today = parseCalendarDateFromInstruction("today", now);
  if (today && today.getTime() >= now.getTime()) {
    return today.toISOString();
  }
  return (
    parseCalendarDateFromInstruction("tomorrow", now)?.toISOString() ??
    new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
  );
}

const LABELED_START_RE =
  /^(?:start date|starts?(?:\s+on|\s+from)?|start)\s*[:\-]?\s*(.+)$/gim;

/** Last explicit Start date / Start line — when alerts may begin. */
export function extractLabeledStartDateText(text: string): string | null {
  const matches = [...text.matchAll(LABELED_START_RE)];
  const last = matches.at(-1)?.[1]?.trim();
  return last || null;
}

/**
 * Resolve when work / WhatsApp reminders may begin.
 * Date without a clock time becomes 9:00 AM IST (start of work day).
 */
export function resolveStartAtIso(
  instruction: string,
  now = new Date(),
): string | null {
  const labeledStart = extractLabeledStartDateText(instruction);
  if (!labeledStart) {
    return null;
  }
  if (!instructionSpecifiesDueDate(labeledStart)) {
    return null;
  }
  let parsed = parseCalendarDateFromInstruction(labeledStart, now);
  if (!parsed) {
    return null;
  }
  if (!instructionSpecifiesDueTime(labeledStart)) {
    parsed = setIstHourMinute(parsed, 9, 0);
  }
  if (!inDueRange(parsed, now)) {
    return null;
  }
  return parsed.toISOString();
}

/** True when the due calendar day (IST) is after today — assign now, remind later. */
export function isFutureIstCalendarDay(dueAt: Date, now = new Date()) {
  return istYmd(dueAt) > istYmd(now);
}

export function isDueIstDayReached(dueAt: Date, now = new Date()) {
  return istYmd(dueAt) <= istYmd(now);
}

/**
 * Prefer labeled Start date in instructions over AI/raw ISO (AI often
 * hallucinates "today"). Falls back to stored startAt, then raw ISO.
 */
export function resolveEffectiveStartAt(params: {
  instructions?: string | null;
  startAtIso?: string | null;
  storedStartAt?: Date | null;
  now?: Date;
}): Date | null {
  const now = params.now ?? new Date();
  const fromLabel = resolveStartAtIso(params.instructions ?? "", now);
  if (fromLabel) {
    const parsed = new Date(fromLabel);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  if (params.storedStartAt && !Number.isNaN(params.storedStartAt.getTime())) {
    return params.storedStartAt;
  }
  const raw = params.startAtIso?.trim();
  if (raw) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

/**
 * When Start is set: quiet until that instant (usually 9:00 AM IST).
 * When only Due/End exists: open for the whole due IST calendar day.
 */
export function isReminderWindowOpen(
  dueAt: Date,
  now = new Date(),
  startAt?: Date | null,
) {
  if (startAt) {
    return now.getTime() >= startAt.getTime();
  }
  return isDueIstDayReached(dueAt, now);
}

/**
 * Same as the reminder window — no assignment WhatsApp before Start
 * (or before due day when Start is missing).
 */
export function shouldNotifyAssigneeNow(
  dueAt: Date,
  now = new Date(),
  startAt?: Date | null,
) {
  return isReminderWindowOpen(dueAt, now, startAt);
}

/** Inclusive end of today IST — cron can start due-day reminders, not only after the clock time. */
export function endOfIstDay(now = new Date()) {
  const parts = istParts(now);
  return atIst(parts.year, parts.month, parts.day, 23, 59) ?? now;
}
