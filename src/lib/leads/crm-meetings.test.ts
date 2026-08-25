import { describe, expect, it } from "vitest";
import {
  addIstMonths,
  extractMeetUrl,
  monthGrid,
  resolveFollowUpMeetUrl,
  startOfIstDay,
} from "@/lib/leads/crm-meetings";

describe("CRM meeting calendar helpers", () => {
  it("reads a Meet link from follow-up notes", () => {
    expect(
      extractMeetUrl("Client meeting scheduled (45 min) · https://meet.google.com/abc-defg-hij"),
    ).toBe("https://meet.google.com/abc-defg-hij");
    expect(resolveFollowUpMeetUrl("https://meet.google.com/xyz", "no link")).toBe(
      "https://meet.google.com/xyz",
    );
  });

  it("builds a Sunday-start month grid", () => {
    const cells = monthGrid("2026-08");
    expect(cells[0]?.ymd).toBeNull();
    expect(cells.find((cell) => cell.day === 1)?.ymd).toBe("2026-08-01");
    expect(cells.filter((cell) => cell.ymd).length).toBe(31);
  });

  it("moves months for the calendar header", () => {
    expect(addIstMonths("2026-08", 1)).toBe("2026-09");
    expect(addIstMonths("2026-01", -1)).toBe("2025-12");
  });

  it("anchors the upcoming filter at the start of the IST day", () => {
    const noonUtc = new Date("2026-08-25T06:30:00.000Z");
    expect(startOfIstDay(noonUtc).toISOString()).toBe("2026-08-24T18:30:00.000Z");
  });
});
