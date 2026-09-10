import { describe, expect, it } from "vitest";
import { addWorkingHours, computePlannedAt, isWorkingDay } from "@/lib/fms/sla";

function localDate(year: number, month: number, day: number, hour: number) {
  return new Date(year, month - 1, day, hour, 0, 0, 0);
}

describe("FMS working-hours TAT", () => {
  it("adds hours on a mid-week working day like wall clock", () => {
    const from = localDate(2026, 1, 7, 10);
    expect(isWorkingDay(from)).toBe(true);
    expect(addWorkingHours(from, 8).getTime()).toBe(
      localDate(2026, 1, 7, 18).getTime(),
    );
  });

  it("skips Sunday when hours spill into the weekend", () => {
    const saturdayEvening = localDate(2026, 1, 10, 22);
    expect(isWorkingDay(saturdayEvening)).toBe(true);
    const planned = addWorkingHours(saturdayEvening, 4);
    expect(planned.getTime()).toBe(localDate(2026, 1, 12, 2).getTime());
  });

  it("skips a listed holiday the same way as calendar-day TAT", () => {
    const holidayNoon = localDate(2026, 1, 8, 12);
    const holidayIso = holidayNoon.toISOString().slice(0, 10);
    expect(isWorkingDay(holidayNoon, { holidayDates: [holidayIso] })).toBe(
      false,
    );
    const planned = addWorkingHours(holidayNoon, 8, {
      holidayDates: [holidayIso],
    });
    expect(planned.getTime()).toBe(localDate(2026, 1, 9, 20).getTime());
  });

  it("uses working hours in computePlannedAt for TAT_WORKING_HOURS", () => {
    const planned = computePlannedAt(
      "TAT_WORKING_HOURS",
      { hours: 8 },
      localDate(2026, 1, 9, 22),
      { skipSaturday: true },
    );
    expect(planned?.getTime()).toBe(localDate(2026, 1, 12, 6).getTime());
  });
});
