import { describe, expect, it } from "vitest";
import {
  countCrmPeriods,
  parseCrmPeriod,
  ymdInCrmPeriod,
} from "@/lib/leads/crm-period";

const now = new Date("2026-08-26T08:00:00.000Z");

describe("crm period filters", () => {
  it("defaults unknown values to all", () => {
    expect(parseCrmPeriod(undefined)).toBe("all");
    expect(parseCrmPeriod("quarter")).toBe("all");
    expect(parseCrmPeriod("year")).toBe("year");
  });

  it("matches day, week, month, and year in IST", () => {
    expect(ymdInCrmPeriod("2026-08-26", "day", now)).toBe(true);
    expect(ymdInCrmPeriod("2026-08-25", "day", now)).toBe(false);
    expect(ymdInCrmPeriod("2026-08-23", "week", now)).toBe(true);
    expect(ymdInCrmPeriod("2026-09-05", "week", now)).toBe(false);
    expect(ymdInCrmPeriod("2026-08-01", "month", now)).toBe(true);
    expect(ymdInCrmPeriod("2026-07-31", "month", now)).toBe(false);
    expect(ymdInCrmPeriod("2026-01-01", "year", now)).toBe(true);
    expect(ymdInCrmPeriod("2025-12-31", "year", now)).toBe(false);
    expect(ymdInCrmPeriod("2025-12-31", "all", now)).toBe(true);
  });

  it("counts the same rows across periods", () => {
    expect(
      countCrmPeriods(["2026-08-26", "2026-09-05", "2025-12-01"], now),
    ).toEqual({
      day: 1,
      week: 1,
      month: 1,
      year: 2,
      all: 3,
    });
  });
});
