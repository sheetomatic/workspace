import { describe, expect, it } from "vitest";
import type { ParsedTaskDraft } from "@/lib/integrations/openai";
import {
  assignmentClarifyText,
  assignmentGaps,
  expandTaskCopy,
  extractCounterparty,
  mergeAssignmentFollowUp,
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
  it("asks for collect-from and due date/time on a short assign like Neeraj / X", () => {
    const gaps = assignmentGaps(
      "Assign task to Neeraj to collect cash from X",
      draft({ assigneeHint: "Neeraj", assigneeUserId: "u-neeraj" }),
    );
    expect(gaps).toEqual(["counterparty", "due_date", "due_time"]);
  });

  it("asks for due time when the assigner said a day but no clock time", () => {
    expect(
      assignmentGaps("Assign AP to collect cash from Ramesh today", draft()),
    ).toEqual(["due_time"]);
  });

  it("asks for due date when only a clock time is present", () => {
    expect(
      assignmentGaps(
        "Assign AP to collect cash from Ramesh at 5:00 PM",
        draft({ dueAtIso: "2026-08-25T11:30:00.000Z" }),
      ),
    ).toEqual(["due_date"]);
  });

  it("is complete when party, date, and clock time are present", () => {
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

describe("mergeAssignmentFollowUp", () => {
  it("treats a name-only reply as the collect-from person", () => {
    const merged = mergeAssignmentFollowUp(
      "Assign task to Neeraj to collect cash from X",
      "Ramesh",
    );
    expect(extractCounterparty(merged)).toBe("Ramesh");
    expect(needsCounterparty(merged)).toBe(false);
  });

  it("keeps date and time from a follow-up reply", () => {
    const merged = mergeAssignmentFollowUp(
      "Assign task to Neeraj to collect cash from X",
      "from Ramesh, today 5:00 PM",
    );
    expect(needsCounterparty(merged)).toBe(false);
    expect(
      assignmentGaps(
        merged,
        draft({
          assigneeHint: "Neeraj",
          assigneeUserId: "u-neeraj",
          dueAtIso: "2026-08-25T11:30:00.000Z",
        }),
      ),
    ).toEqual([]);
  });
});

describe("expandTaskCopy", () => {
  it("writes a full title and how-to description", () => {
    const copy = expandTaskCopy(
      draft({ assigneeHint: "Neeraj" }),
      "Assign Neeraj to collect cash from Ramesh today 5pm",
    );
    expect(copy.title.split(/\s+/).length).toBeGreaterThanOrEqual(8);
    expect(copy.instructions).toMatch(/Ramesh/);
    expect(copy.instructions).toMatch(/How to/i);
    expect(copy.instructions).toMatch(/Done/i);
    expect(copy.instructions).toMatch(/count/i);
  });
});

describe("assignmentClarifyText", () => {
  it("asks collect-from and due date time together", () => {
    const text = assignmentClarifyText({
      missing: ["counterparty", "due_date", "due_time"],
      assigneeHint: "Neeraj",
      title: "Collect cash",
    });
    expect(text).toMatch(/Collect from whom/);
    expect(text).toMatch(/Due date and time/);
    expect(text).toMatch(/Neeraj/);
  });
});
