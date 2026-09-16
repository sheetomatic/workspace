import { describe, expect, it } from "vitest";
import {
  filterChecklistPcRows,
  type ChecklistPcRow,
} from "./pc-rows";

function row(overrides: Partial<ChecklistPcRow>): ChecklistPcRow {
  return {
    templateId: "t1",
    title: "GST 3B",
    instructions: null,
    team: "ACCOUNTS",
    teamLabel: "Accounts",
    frequency: "MONTHLY",
    frequencyLabel: "Monthly",
    dueMonthDay: 20,
    dueWeekday: null,
    dueMonth: null,
    dueAt: "2026-09-16T12:30:00.000Z",
    dueDateLabel: "16 Sep 2026",
    dueRuleLabel: "Monthly · day 20",
    doerId: "u1",
    doerLabel: "Ravi",
    occurrenceId: "o1",
    occurrenceStatus: "PENDING",
    overdue: false,
    notes: null,
    canMarkDone: true,
    ...overrides,
  };
}

describe("filterChecklistPcRows", () => {
  const now = new Date("2026-09-16T12:00:00.000Z");
  const rows = [
    row({ templateId: "gst", title: "GST 3B", dueAt: "2026-09-16T12:00:00.000Z" }),
    row({
      templateId: "tds",
      title: "TDS payment",
      dueAt: "2026-09-18T12:00:00.000Z",
      doerId: "u2",
      doerLabel: "Neha",
    }),
    row({
      templateId: "pf",
      title: "PF return",
      team: "HR",
      teamLabel: "HR",
      dueAt: "2026-10-05T12:00:00.000Z",
    }),
    row({
      templateId: "recon",
      title: "Bank recon",
      overdue: true,
      dueAt: "2026-09-10T12:00:00.000Z",
    }),
  ];

  it("filters by department", () => {
    expect(filterChecklistPcRows(rows, { department: "HR" }, now).map((item) => item.templateId)).toEqual([
      "pf",
    ]);
  });

  it("filters by doer", () => {
    expect(filterChecklistPcRows(rows, { doer: "u2" }, now).map((item) => item.templateId)).toEqual([
      "tds",
    ]);
  });

  it("filters this week (Mon–Sun)", () => {
    expect(
      filterChecklistPcRows(rows, { due: "this_week" }, now).map((item) => item.templateId),
    ).toEqual(["gst", "tds"]);
  });

  it("filters this month", () => {
    expect(
      filterChecklistPcRows(rows, { due: "this_month" }, now).map((item) => item.templateId),
    ).toEqual(["gst", "tds", "recon"]);
  });

  it("filters a specific due date", () => {
    expect(
      filterChecklistPcRows(rows, { date: "2026-09-16" }, now).map((item) => item.templateId),
    ).toEqual(["gst"]);
  });

  it("filters overdue", () => {
    expect(
      filterChecklistPcRows(rows, { due: "overdue" }, now).map((item) => item.templateId),
    ).toEqual(["recon"]);
  });
});
