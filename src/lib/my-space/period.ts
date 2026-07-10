import {
  parseLeadsPeriodParams,
  type LeadsPeriodRange,
  type LeadsPeriodSearchParams,
} from "@/lib/leads/period";

export type MySpacePeriodType = "monthly" | "all";

export function parseMySpacePeriodParams(
  params: LeadsPeriodSearchParams & { period?: string },
): LeadsPeriodRange {
  const raw = params.period?.trim().toLowerCase();
  if (raw === "all") {
    return parseLeadsPeriodParams({ ...params, period: "all" });
  }
  return parseLeadsPeriodParams({ ...params, period: "monthly" });
}

export function mySpacePeriodHref(type: MySpacePeriodType, month?: string) {
  const search = new URLSearchParams();
  search.set("period", type);
  if (type === "monthly" && month) {
    search.set("month", month);
  }
  return `/app/my-space?${search.toString()}`;
}
