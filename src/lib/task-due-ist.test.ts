import { describe, expect, it } from "vitest";
import {
  instructionSpecifiesDueTime,
  parseIstDateTime,
} from "@/lib/task-due-ist";

describe("parseIstDateTime", () => {
  it("treats naive ISO as IST, not UTC (avoids 11:30 AM)", () => {
    const parsed = parseIstDateTime("2026-08-26T17:00:00");
    expect(parsed?.toISOString()).toBe("2026-08-26T11:30:00.000Z");
    expect(
      parsed?.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    ).toBe("5:00 pm");
  });

  it("keeps explicit UTC offsets", () => {
    const parsed = parseIstDateTime("2026-08-26T06:00:00.000Z");
    expect(
      parsed?.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    ).toBe("11:30 am");
  });
});

describe("instructionSpecifiesDueTime", () => {
  it("requires a clock time, not only a day", () => {
    expect(instructionSpecifiesDueTime("assign AP to collect cash today")).toBe(
      false,
    );
    expect(
      instructionSpecifiesDueTime("assign AP to collect cash today 5pm"),
    ).toBe(true);
    expect(
      instructionSpecifiesDueTime("collect cash from Ramesh by 11:00 AM"),
    ).toBe(true);
  });
});
