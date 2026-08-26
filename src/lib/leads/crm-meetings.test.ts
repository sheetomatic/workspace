import { describe, expect, it } from "vitest";
import {
  addIstMonths,
  countCrmMeetings,
  extractMeetUrl,
  filterCrmMeetings,
  monthGrid,
  resolveFollowUpMeetUrl,
  startOfIstDay,
  startOfIstWeekYmd,
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

  it("counts today, week, month, upcoming, and done from the same rows", () => {
    const now = new Date("2026-08-26T08:00:00.000Z"); // Wed 26 Aug IST afternoon
    const rows = [
      { ymd: "2026-08-26", completed: false },
      { ymd: "2026-09-05", completed: false },
      { ymd: "2026-08-20", completed: true },
    ];
    expect(startOfIstWeekYmd("2026-08-26")).toBe("2026-08-23");
    expect(countCrmMeetings(rows, now)).toEqual({
      today: 1,
      week: 1,
      month: 1,
      upcoming: 2,
      done: 1,
    });
    expect(filterCrmMeetings(rows, "upcoming", { now })).toHaveLength(2);
    expect(filterCrmMeetings(rows, "today", { now })).toHaveLength(1);
    expect(filterCrmMeetings(rows, "done", { now })).toHaveLength(1);
    expect(filterCrmMeetings(rows, "day", { now, date: "2026-09-05" })).toEqual([
      rows[1],
    ]);
  });
});
