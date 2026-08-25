import { describe, expect, it } from "vitest";
import type { ParsedTaskDraft } from "@/lib/integrations/openai";
import {
  assignmentGaps,
  expandTaskCopy,
  needsCounterparty,
} from "@/lib/whatsapp-bot/task-assignment-complete";

function draft(partial: Partial<ParsedTaskDraft> = {}): ParsedTaskDraft {
  return {
    title: "Collect cash",
    instructions: "",
    assigneeUserId: "u1",
    assigneeHint: "AP",
    priority: "MEDIUM",
    department: "ACCOUNTS",
    category: null,
    dueAtIso: null,
    dueTimeSpecified: false,
    frequency: "ONCE",
    isRecurring: false,
    remindViaEmail: false,
    remindViaWhatsApp: true,
    recurrenceWeeklyDays: [],
    recurrenceMonthDay: null,
    ...partial,
  };
}

describe("needsCounterparty", () => {
  it("asks who to collect from when the party is X or missing", () => {
    expect(
      needsCounterparty("Assign task to AP to collect cash from X"),
    ).toBe(true);
    expect(needsCounterparty("Assign AP to collect cash")).toBe(true);
    expect(
      needsCounterparty("Assign AP to collect cash from Ramesh today 5pm"),
    ).toBe(false);
  });
});

describe("assignmentGaps", () => {
  it("asks for due time when the assigner did not say one", () => {
    expect(
      assignmentGaps("Assign AP to collect cash from Ramesh", draft()),
    ).toContain("due_at");
    expect(
      assignmentGaps("Assign AP to collect cash from Ramesh", draft()),
    ).not.toContain("counterparty");
  });

  it("is complete when party and clock time are present", () => {
    expect(
      assignmentGaps(
        "Assign AP to collect cash from Ramesh today 5:00 PM",
        draft({
          dueAtIso: "2026-08-25T11:30:00.000Z",
          dueTimeSpecified: true,
        }),
      ),
    ).toEqual([]);
  });
});

describe("expandTaskCopy", () => {
  it("writes a full title and how-to description", () => {
    const copy = expandTaskCopy(
      draft(),
      "Assign AP to collect cash from Ramesh today 5pm",
    );
    expect(copy.title.split(/\s+/).length).toBeGreaterThanOrEqual(8);
    expect(copy.instructions).toMatch(/Ramesh/);
    expect(copy.instructions).toMatch(/Done/i);
  });
});
