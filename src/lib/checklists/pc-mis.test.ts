import { describe, expect, it } from "vitest";
import type { ChecklistMisRow } from "./mis";
import {
  buildPcExceptionRows,
  buildPcPersonMisRows,
  classifyChecklistMisRow,
} from "./pc-mis";

function row(overrides: Partial<ChecklistMisRow>): ChecklistMisRow {
  return {
    id: "1",
    title: "GST 3B",
    owner: "Ravi",
    ownerId: "u1",
    team: "ACCOUNTS",
    status: "DONE",
    score: 100,
    delayed: false,
    plannedAt: new Date("2026-09-10T12:00:00+05:30"),
    actualAt: new Date("2026-09-10T11:00:00+05:30"),
    href: "/app/checklists/accounts",
    ...overrides,
  };
}

describe("PC person-wise deficit", () => {
  const now = new Date("2026-09-16T10:00:00+05:30");

  it("classifies pending, overdue, done-late, and on-time", () => {
    expect(
      classifyChecklistMisRow(
        row({ status: "PENDING", plannedAt: new Date("2026-09-20T18:00:00+05:30") }),
        now,
      ),
    ).toBe("pending");
    expect(
      classifyChecklistMisRow(
        row({ status: "OVERDUE", delayed: true, plannedAt: new Date("2026-09-10T18:00:00+05:30") }),
        now,
      ),
    ).toBe("overdue");
    expect(classifyChecklistMisRow(row({ status: "DONE", delayed: true, score: 80 }), now)).toBe(
      "doneLate",
    );
    expect(classifyChecklistMisRow(row({ status: "DONE", delayed: false }), now)).toBe("onTime");
  });

  it("shows negative deficit from violating items, not % done", () => {
    const items = [
      row({ id: "1", status: "DONE", delayed: false, score: 100 }),
      row({ id: "2", status: "DONE", delayed: false, score: 100 }),
      row({
        id: "3",
        status: "PENDING",
        delayed: true,
        score: 0,
        plannedAt: new Date("2026-09-20T18:00:00+05:30"),
      }),
      row({
        id: "4",
        status: "PENDING",
        delayed: true,
        score: 0,
        plannedAt: new Date("2026-09-22T18:00:00+05:30"),
      }),
      row({ id: "5", status: "DONE", delayed: false, score: 100 }),
      row({ id: "6", status: "DONE", delayed: false, score: 100 }),
      row({ id: "7", status: "DONE", delayed: false, score: 100 }),
      row({ id: "8", status: "DONE", delayed: false, score: 100 }),
      row({ id: "9", status: "DONE", delayed: false, score: 100 }),
      row({ id: "10", status: "DONE", delayed: false, score: 100 }),
    ];

    const [person] = buildPcPersonMisRows(items, now);
    expect(person.total).toBe(10);
    expect(person.pending).toBe(2);
    expect(person.deficitPct).toBe(20);
  });

  it("lists overdue, pending, and done-late as exceptions", () => {
    const exceptions = buildPcExceptionRows(
      [
        row({ id: "late", status: "DONE", delayed: true, title: "Done late GST" }),
        row({
          id: "open",
          status: "PENDING",
          plannedAt: new Date("2026-09-20T18:00:00+05:30"),
          title: "Pending TDS",
        }),
        row({
          id: "over",
          status: "OVERDUE",
          delayed: true,
          plannedAt: new Date("2026-09-01T18:00:00+05:30"),
          title: "Overdue recon",
        }),
        row({ id: "ok", status: "DONE", delayed: false, title: "On time" }),
      ],
      now,
    );

    expect(exceptions.map((item) => item.kind)).toEqual(["overdue", "pending", "doneLate"]);
  });
});
