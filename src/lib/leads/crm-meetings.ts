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

export function monthLabel(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
