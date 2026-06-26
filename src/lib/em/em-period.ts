export type EmPeriodType = "weekly" | "monthly" | "yearly" | "custom";

export type EmPeriodRange = {
  type: EmPeriodType;
  start: Date;
  end: Date;
  startIso: string;
  endIso: string;
  periodLabel: string;
  week?: string;
  month?: string;
  year?: string;
  from?: string;
  to?: string;
};

export type EmPeriodSearchParams = {
  period?: string;
  week?: string;
  month?: string;
  year?: string;
  from?: string;
  to?: string;
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
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

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function formatPeriodDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
}

export function dateToIsoWeek(date: Date) {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const year = utc.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${year}-W${pad2(week)}`;
}

export function isoWeekToRange(isoWeek: string) {
  const match = /^(\d{4})-W(\d{2})$/.exec(isoWeek);
  if (!match) {
    return currentWeekRange();
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

export function currentWeekRange() {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday, end: endOfDay(sunday) };
}

function monthToRange(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      month: `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`,
    };
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      month: `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`,
    };
  }

  return {
    start: new Date(year, monthIndex, 1),
    end: endOfDay(new Date(year, monthIndex + 1, 0)),
    month,
  };
}

function yearToRange(yearValue: string) {
  const year = Number(yearValue);
  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: endOfDay(new Date(now.getFullYear(), 11, 31)),
      year: String(now.getFullYear()),
    };
  }

  return {
    start: new Date(year, 0, 1),
    end: endOfDay(new Date(year, 11, 31)),
    year: String(year),
  };
}

function buildRange(
  type: EmPeriodType,
  start: Date,
  end: Date,
  extras: Pick<EmPeriodRange, "week" | "month" | "year" | "from" | "to"> = {},
): EmPeriodRange {
  const startIso = toIsoDate(start);
  const endIso = toIsoDate(end);
  return {
    type,
    start,
    end,
    startIso,
    endIso,
    periodLabel: `${formatPeriodDate(start)} - ${formatPeriodDate(end)}`,
    ...extras,
  };
}

export function parseEmPeriodParams(params: EmPeriodSearchParams): EmPeriodRange {
  const type = (params.period ?? "weekly") as EmPeriodType;

  if (type === "monthly") {
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
    const month = params.month ?? defaultMonth;
    const { start, end } = monthToRange(month);
    return buildRange("monthly", start, end, { month });
  }

  if (type === "yearly") {
    const defaultYear = String(new Date().getFullYear());
    const year = params.year ?? defaultYear;
    const { start, end } = yearToRange(year);
    return buildRange("yearly", start, end, { year });
  }

  if (type === "custom") {
    const from = params.from ?? toIsoDate(new Date());
    const to = params.to ?? from;
    const start = parseIsoDate(from) ?? new Date();
    const endDate = parseIsoDate(to) ?? start;
    const end = endOfDay(endDate < start ? start : endDate);
    const normalizedStart = endDate < start ? endDate : start;
    return buildRange("custom", normalizedStart, end, {
      from: toIsoDate(normalizedStart),
      to: toIsoDate(endDate < start ? start : endDate),
    });
  }

  const week = params.week ?? dateToIsoWeek(new Date());
  const { start, end } = isoWeekToRange(week);
  return buildRange("weekly", start, end, { week });
}

export function emPeriodToSearchParams(range: EmPeriodRange) {
  const params = new URLSearchParams();
  params.set("period", range.type);

  if (range.type === "weekly" && range.week) {
    params.set("week", range.week);
  }
  if (range.type === "monthly" && range.month) {
    params.set("month", range.month);
  }
  if (range.type === "yearly" && range.year) {
    params.set("year", range.year);
  }
  if (range.type === "custom") {
    if (range.from) {
      params.set("from", range.from);
    }
    if (range.to) {
      params.set("to", range.to);
    }
  }

  return params;
}

function isBetween(date: Date, start: Date, end: Date) {
  const time = date.getTime();
  return time >= start.getTime() && time <= end.getTime();
}

export function taskFallsInEmPeriod(
  task: {
    status: string;
    dueAt: Date | null;
    completedAt: Date | null;
  },
  range: EmPeriodRange,
) {
  if (task.completedAt && isBetween(task.completedAt, range.start, range.end)) {
    return true;
  }
  if (task.dueAt && isBetween(task.dueAt, range.start, range.end)) {
    return true;
  }
  if (task.status !== "COMPLETED" && task.dueAt && task.dueAt < range.start) {
    return true;
  }
  return false;
}

export function fmsJobFallsInEmPeriod(
  job: {
    stepStates: Array<{
      status: string;
      plannedAt: Date | null;
      actualAt: Date | null;
    }>;
  },
  range: EmPeriodRange,
) {
  return job.stepStates.some((step) => {
    if (step.plannedAt && isBetween(step.plannedAt, range.start, range.end)) {
      return true;
    }
    if (step.actualAt && isBetween(step.actualAt, range.start, range.end)) {
      return true;
    }
    if (
      step.status === "IN_PROGRESS" &&
      step.plannedAt &&
      step.plannedAt <= range.end
    ) {
      return true;
    }
    return false;
  });
}

export function fmsStepFallsInEmPeriod(
  step: {
    plannedAt: Date | null;
    actualAt: Date | null;
    status: string;
  },
  range: EmPeriodRange,
) {
  if (step.plannedAt && step.plannedAt <= range.end) {
    if (!step.actualAt || step.actualAt >= range.start) {
      return true;
    }
  }
  return false;
}
