import { dateToIsoWeek, toIsoDate } from "@/lib/em/em-period";

export type LeadsPeriodType = "weekly" | "monthly" | "quarterly" | "yearly";

export type LeadsPeriodRange = {
  type: LeadsPeriodType;
  start: Date;
  end: Date;
  startIso: string;
  endIso: string;
  periodLabel: string;
  week?: string;
  month?: string;
  quarter?: string;
  year?: string;
};

export type LeadsPeriodSearchParams = {
  period?: string;
  week?: string;
  month?: string;
  quarter?: string;
  year?: string;
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function formatPeriodDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
}

function parseIsoDate(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function isoWeekToRange(isoWeek: string) {
  const match = /^(\d{4})-W(\d{2})$/.exec(isoWeek);
  if (!match) {
    const now = new Date();
    const day = (now.getDay() + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - day);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: monday, end: endOfDay(sunday) };
  }

  const year = Number(match[1]);
  const week = Number(match[2]);
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = (jan4.getDay() + 6) % 7;
  const monday = new Date(year, 0, 4 - dayOfWeek + (week - 1) * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday, end: endOfDay(sunday) };
}

function monthToRange(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  const now = new Date();
  const fallback = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
  const value = match ? month : fallback;
  const year = Number(value.slice(0, 4));
  const monthIndex = Number(value.slice(5, 7)) - 1;
  if (monthIndex < 0 || monthIndex > 11) {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      month: fallback,
    };
  }
  return {
    start: new Date(year, monthIndex, 1),
    end: endOfDay(new Date(year, monthIndex + 1, 0)),
    month: value,
  };
}

function quarterToRange(quarter: string) {
  const match = /^(\d{4})-Q([1-4])$/.exec(quarter);
  const now = new Date();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  const fallback = `${now.getFullYear()}-Q${currentQuarter}`;
  const value = match ? quarter : fallback;
  const year = Number(value.slice(0, 4));
  const q = Number(value.slice(6, 7));
  const startMonth = (q - 1) * 3;
  return {
    start: new Date(year, startMonth, 1),
    end: endOfDay(new Date(year, startMonth + 3, 0)),
    quarter: value,
  };
}

function yearToRange(yearValue: string) {
  const year = Number(yearValue);
  const now = new Date();
  const resolved = Number.isFinite(year) && year >= 2000 && year <= 2100
    ? year
    : now.getFullYear();
  return {
    start: new Date(resolved, 0, 1),
    end: endOfDay(new Date(resolved, 11, 31)),
    year: String(resolved),
  };
}

function buildRange(
  type: LeadsPeriodType,
  start: Date,
  end: Date,
  extras: Pick<LeadsPeriodRange, "week" | "month" | "quarter" | "year"> = {},
): LeadsPeriodRange {
  return {
    type,
    start,
    end,
    startIso: toIsoDate(start),
    endIso: toIsoDate(end),
    periodLabel: `${formatPeriodDate(start)} – ${formatPeriodDate(end)}`,
    ...extras,
  };
}

export function currentQuarterToken(date = new Date()) {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `${date.getFullYear()}-Q${quarter}`;
}

export function parseLeadsPeriodParams(
  params: LeadsPeriodSearchParams,
): LeadsPeriodRange {
  const type = (params.period ?? "weekly") as LeadsPeriodType;

  if (type === "monthly") {
    const now = new Date();
    const month = params.month ?? `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
    const { start, end, month: resolved } = monthToRange(month);
    return buildRange("monthly", start, end, { month: resolved });
  }

  if (type === "quarterly") {
    const quarter = params.quarter ?? currentQuarterToken();
    const { start, end, quarter: resolved } = quarterToRange(quarter);
    return buildRange("quarterly", start, end, { quarter: resolved });
  }

  if (type === "yearly") {
    const year = params.year ?? String(new Date().getFullYear());
    const { start, end, year: resolved } = yearToRange(year);
    return buildRange("yearly", start, end, { year: resolved });
  }

  const week = params.week ?? dateToIsoWeek(new Date());
  const { start, end } = isoWeekToRange(week);
  return buildRange("weekly", start, end, { week });
}

export function leadsPeriodToSearchParams(range: LeadsPeriodRange) {
  const params = new URLSearchParams();
  params.set("period", range.type);
  if (range.type === "weekly" && range.week) {
    params.set("week", range.week);
  }
  if (range.type === "monthly" && range.month) {
    params.set("month", range.month);
  }
  if (range.type === "quarterly" && range.quarter) {
    params.set("quarter", range.quarter);
  }
  if (range.type === "yearly" && range.year) {
    params.set("year", range.year);
  }
  return params;
}

/** Prisma filter on capturedAt with createdAt fallback for legacy rows. */
export function leadCapturedAtWhere(range: LeadsPeriodRange) {
  return {
    OR: [
      {
        capturedAt: {
          gte: range.start,
          lte: range.end,
        },
      },
      {
        capturedAt: null,
        createdAt: {
          gte: range.start,
          lte: range.end,
        },
      },
    ],
  };
}

export function shiftLeadsPeriod(
  range: LeadsPeriodRange,
  direction: -1 | 1,
): LeadsPeriodRange {
  if (range.type === "weekly" && range.week) {
    const { start } = isoWeekToRange(range.week);
    start.setDate(start.getDate() + direction * 7);
    const week = dateToIsoWeek(start);
    const shifted = isoWeekToRange(week);
    return buildRange("weekly", shifted.start, shifted.end, { week });
  }

  if (range.type === "monthly" && range.month) {
    const year = Number(range.month.slice(0, 4));
    const month = Number(range.month.slice(5, 7)) - 1;
    const next = new Date(year, month + direction, 1);
    const token = `${next.getFullYear()}-${pad2(next.getMonth() + 1)}`;
    const shifted = monthToRange(token);
    return buildRange("monthly", shifted.start, shifted.end, { month: shifted.month });
  }

  if (range.type === "quarterly" && range.quarter) {
    const year = Number(range.quarter.slice(0, 4));
    const quarter = Number(range.quarter.slice(6, 7));
    const month = (quarter - 1) * 3 + direction * 3;
    const next = new Date(year, month, 1);
    const token = currentQuarterToken(next);
    const shifted = quarterToRange(token);
    return buildRange("quarterly", shifted.start, shifted.end, {
      quarter: shifted.quarter,
    });
  }

  const year = Number(range.year ?? new Date().getFullYear()) + direction;
  const shifted = yearToRange(String(year));
  return buildRange("yearly", shifted.start, shifted.end, { year: shifted.year });
}
