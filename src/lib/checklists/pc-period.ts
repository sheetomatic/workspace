export type PcPeriod = "today" | "week" | "month" | "all";

export function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Monday-start week, matching weekly EM reviews. */
export function startOfWeekMonday(date: Date) {
  const start = startOfLocalDay(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  return start;
}

export function endOfWeekSunday(date: Date) {
  const end = startOfWeekMonday(date);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function pcPeriodRange(period: PcPeriod, now = new Date()) {
  if (period === "today") {
    const start = startOfLocalDay(now);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end, includeOverdue: true };
  }
  if (period === "week") {
    return {
      start: startOfWeekMonday(now),
      end: endOfWeekSunday(now),
      includeOverdue: true,
    };
  }
  if (period === "month") {
    return {
      start: startOfMonth(now),
      end: endOfMonth(now),
      includeOverdue: true,
    };
  }
  return { start: null, end: null, includeOverdue: true };
}

/** Open PC work due in the window. Overdue items stay on Today / Week / Month so PC can chase. */
export function isPcWorkInPeriod(
  item: { dueAt?: Date | null; overdue: boolean },
  period: PcPeriod,
  now = new Date(),
) {
  if (period === "all") {
    return true;
  }
  const { start, end, includeOverdue } = pcPeriodRange(period, now);
  if (includeOverdue && item.overdue) {
    return true;
  }
  if (!item.dueAt || !start || !end) {
    return period === "month";
  }
  const t = item.dueAt.getTime();
  return t >= start.getTime() && t <= end.getTime();
}
