import { formatDatetimeLocalIst, parseDatetimeLocalAsIst } from "@/lib/leads/ist-datetime";

const MEET_URL_RE =
  /https?:\/\/(?:meet\.google\.com|zoom\.us|teams\.microsoft\.com)[^\s<>"']+/i;

export function istYmd(date: Date) {
  return formatDatetimeLocalIst(date).slice(0, 10);
}

export function startOfIstDay(date = new Date()) {
  return parseDatetimeLocalAsIst(`${istYmd(date)}T00:00`) ?? date;
}

export function extractMeetUrl(notes: string | null | undefined) {
  const match = notes?.match(MEET_URL_RE);
  return match?.[0] ?? null;
}

export function resolveFollowUpMeetUrl(
  meetUrl: string | null | undefined,
  notes: string | null | undefined,
) {
  return meetUrl?.trim() || extractMeetUrl(notes);
}

export function isIstToday(date: Date, now = new Date()) {
  return istYmd(date) === istYmd(now);
}

export function addIstMonths(ymd: string, months: number) {
  const [year, month] = ymd.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1 + months, 1));
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function monthGrid(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const startPad = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: Array<{ ymd: string | null; day: number | null }> = [];
  for (let i = 0; i < startPad; i += 1) {
    cells.push({ ymd: null, day: null });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      day,
      ymd: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ ymd: null, day: null });
  }
  return cells;
}

export function addIstDays(ymd: string, days: number) {
  const [year, month, day] = ymd.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

/** Sunday-start week, matching the meetings calendar. */
export function startOfIstWeekYmd(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addIstDays(ymd, -weekday);
}

export const CRM_MEETING_VIEWS = [
  "today",
  "week",
  "month",
  "upcoming",
  "done",
  "day",
] as const;

export type CrmMeetingView = (typeof CRM_MEETING_VIEWS)[number];

export function parseCrmMeetingView(raw: string | null | undefined): CrmMeetingView {
  if (raw && (CRM_MEETING_VIEWS as readonly string[]).includes(raw)) {
    return raw as CrmMeetingView;
  }
  return "today";
}

export type CrmMeetingCountRow = {
  ymd: string;
  completed: boolean;
};

export function countCrmMeetings(rows: CrmMeetingCountRow[], now = new Date()) {
  const today = istYmd(now);
  const month = today.slice(0, 7);
  const weekStart = startOfIstWeekYmd(today);
  const weekEnd = addIstDays(weekStart, 6);
  const counts = { today: 0, week: 0, month: 0, upcoming: 0, done: 0 };
  for (const row of rows) {
    if (row.completed) {
      counts.done += 1;
      continue;
    }
    if (row.ymd >= today) {
      counts.upcoming += 1;
    }
    if (row.ymd === today) {
      counts.today += 1;
    }
    if (row.ymd >= weekStart && row.ymd <= weekEnd) {
      counts.week += 1;
    }
    if (row.ymd.startsWith(month)) {
      counts.month += 1;
    }
  }
  return counts;
}

export function filterCrmMeetings<T extends CrmMeetingCountRow>(
  rows: T[],
  view: CrmMeetingView,
  options?: { date?: string | null; now?: Date },
) {
  const today = istYmd(options?.now ?? new Date());
  const month = today.slice(0, 7);
  const weekStart = startOfIstWeekYmd(today);
  const weekEnd = addIstDays(weekStart, 6);
  const day = options?.date && /^\d{4}-\d{2}-\d{2}$/.test(options.date)
    ? options.date
    : today;

  return rows.filter((row) => {
    switch (view) {
      case "done":
        return row.completed;
      case "upcoming":
        return !row.completed && row.ymd >= today;
      case "week":
        return !row.completed && row.ymd >= weekStart && row.ymd <= weekEnd;
      case "month":
        return !row.completed && row.ymd.startsWith(month);
      case "day":
        return row.ymd === day;
      default:
        return !row.completed && row.ymd === today;
    }
  });
}

export function meetingViewTitle(
  view: CrmMeetingView,
  count: number,
  date?: string | null,
) {
  const noun = count === 1 ? "meeting" : "meetings";
  switch (view) {
    case "done":
      return `${count} ${noun} done`;
    case "upcoming":
      return `${count} upcoming ${noun}`;
    case "week":
      return `${count} ${noun} this week`;
    case "month":
      return `${count} ${noun} this month`;
    case "day":
      return `${date ?? "Day"} · ${count} ${noun}`;
    default:
      return `${count} ${noun} today`;
  }
}

export function monthLabel(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
