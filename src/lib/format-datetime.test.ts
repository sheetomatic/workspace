import { describe, expect, it } from "vitest";
import { formatIndianGreetingDate } from "@/lib/format-datetime";

describe("formatIndianGreetingDate", () => {
  it("uses a fixed punctuation pattern", () => {
    const formatted = formatIndianGreetingDate(new Date("2026-06-30T10:00:00+05:30"));
    expect(formatted).toMatch(/^Tuesday, 30 June 2026$/);
  });
});
