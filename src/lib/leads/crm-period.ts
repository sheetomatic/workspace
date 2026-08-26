import { addIstDays, istYmd, startOfIstWeekYmd } from "@/lib/leads/crm-meetings";

export const CRM_PERIODS = ["day", "week", "month", "year", "all"] as const;

export type CrmPeriod = (typeof CRM_PERIODS)[number];

export function parseCrmPeriod(raw: string | null | undefined): CrmPeriod {
  if (raw && (CRM_PERIODS as readonly string[]).includes(raw)) {
    return raw as CrmPeriod;
  }
  return "all";
}

export function ymdInCrmPeriod(
  ymd: string,
  period: CrmPeriod,
  now = new Date(),
) {
  const today = istYmd(now);
  switch (period) {
    case "day":
      return ymd === today;
    case "week": {
      const start = startOfIstWeekYmd(today);
      const end = addIstDays(start, 6);
      return ymd >= start && ymd <= end;
    }
    case "month":
      return ymd.startsWith(today.slice(0, 7));
    case "year":
      return ymd.startsWith(today.slice(0, 4));
    default:
      return true;
  }
}

export function countCrmPeriods(ymds: string[], now = new Date()) {
  const counts = { day: 0, week: 0, month: 0, year: 0, all: ymds.length };
  for (const ymd of ymds) {
    if (ymdInCrmPeriod(ymd, "day", now)) counts.day += 1;
    if (ymdInCrmPeriod(ymd, "week", now)) counts.week += 1;
    if (ymdInCrmPeriod(ymd, "month", now)) counts.month += 1;
    if (ymdInCrmPeriod(ymd, "year", now)) counts.year += 1;
  }
  return counts;
}

export function crmPeriodKpis(
  hrefBase: string,
  counts: ReturnType<typeof countCrmPeriods>,
  active: CrmPeriod,
) {
  return [
    { label: "Today", value: String(counts.day), href: `${hrefBase}?period=day`, active: active === "day", accent: "blue" as const },
    { label: "This week", value: String(counts.week), href: `${hrefBase}?period=week`, active: active === "week" },
    { label: "This month", value: String(counts.month), href: `${hrefBase}?period=month`, active: active === "month" },
    { label: "This year", value: String(counts.year), href: `${hrefBase}?period=year`, active: active === "year" },
    { label: "All", value: String(counts.all), href: `${hrefBase}?period=all`, active: active === "all", accent: "success" as const },
  ];
}

export function crmPeriodLabel(period: CrmPeriod) {
  switch (period) {
    case "day":
      return "today";
    case "week":
      return "this week";
    case "month":
      return "this month";
    case "year":
      return "this year";
    default:
      return "all time";
  }
}
