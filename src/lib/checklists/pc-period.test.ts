import { describe, expect, it } from "vitest";
import {
  isPcWorkInPeriod,
  pcPeriodRange,
  startOfWeekMonday,
} from "@/lib/checklists/pc-period";

describe("PC period windows", () => {
  const wednesday = new Date(2026, 8, 16, 10, 0, 0); // Wed 16 Sep 2026

  it("uses Monday–Sunday for this week", () => {
    expect(startOfWeekMonday(wednesday).toDateString()).toBe(
      new Date(2026, 8, 14).toDateString(),
    );
    const range = pcPeriodRange("week", wednesday);
    expect(range.start?.getDate()).toBe(14);
    expect(range.end?.getDate()).toBe(20);
  });

  it("keeps overdue on today even if due yesterday", () => {
    const yesterday = new Date(2026, 8, 15, 9, 0, 0);
    expect(
      isPcWorkInPeriod({ dueAt: yesterday, overdue: true }, "today", wednesday),
    ).toBe(true);
    expect(
      isPcWorkInPeriod({ dueAt: yesterday, overdue: false }, "today", wednesday),
    ).toBe(false);
  });

  it("includes this week's due work and this month's due work", () => {
    const friday = new Date(2026, 8, 18, 12, 0, 0);
    const nextMonth = new Date(2026, 9, 2, 12, 0, 0);
    expect(isPcWorkInPeriod({ dueAt: friday, overdue: false }, "week", wednesday)).toBe(
      true,
    );
    expect(
      isPcWorkInPeriod({ dueAt: nextMonth, overdue: false }, "week", wednesday),
    ).toBe(false);
    expect(
      isPcWorkInPeriod({ dueAt: friday, overdue: false }, "month", wednesday),
    ).toBe(true);
  });
});
