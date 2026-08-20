import { describe, expect, it } from "vitest";
import {
  formatDatetimeLocalIst,
  parseDatetimeLocalAsIst,
} from "@/lib/leads/ist-datetime";

describe("parseDatetimeLocalAsIst", () => {
  it("treats 2:00 PM wall time as IST, not UTC", () => {
    const date = parseDatetimeLocalAsIst("2026-08-19T14:00");
    expect(date).not.toBeNull();
    // 14:00 IST = 08:30 UTC
    expect(date!.toISOString()).toBe("2026-08-19T08:30:00.000Z");
  });

  it("formats back to the same datetime-local value in IST", () => {
    const date = parseDatetimeLocalAsIst("2026-08-19T14:00")!;
    expect(formatDatetimeLocalIst(date)).toBe("2026-08-19T14:00");
  });

  it("labels as 2:00 pm IST (not 7:30 pm)", () => {
    const date = parseDatetimeLocalAsIst("2026-08-19T14:00")!;
    const label = date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    });
    expect(label.toLowerCase().replace(/\s/g, "")).toMatch(/2:00|14:00/);
  });

  it("returns null for empty input", () => {
    expect(parseDatetimeLocalAsIst("")).toBeNull();
  });
});
