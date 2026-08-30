import { describe, expect, it } from "vitest";
import {
  extractLabeledStartDateText,
  instructionSpecifiesDueDate,
  instructionSpecifiesDueTime,
  isReminderWindowOpen,
  parseCalendarDateFromInstruction,
  parseIstDateTime,
  resolveDueAtIso,
  resolveEffectiveStartAt,
  resolveStartAtIso,
  shouldNotifyAssigneeNow,
} from "@/lib/task-due-ist";

const NOW = new Date("2026-08-26T04:00:00.000Z"); // 9:30 AM IST on 26 Aug

function istDay(iso: string | null) {
  if (!iso) {
    return null;
  }
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date(iso),
  );
}

function istHour(iso: string | null) {
  if (!iso) {
    return null;
  }
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

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
});

describe("instructionSpecifiesDueTime", () => {
  it("requires a clock time, not only a day", () => {
    expect(instructionSpecifiesDueTime("assign AP to collect cash today")).toBe(
      false,
    );
    expect(
      instructionSpecifiesDueTime("assign AP to collect cash today 5pm"),
    ).toBe(true);
    expect(instructionSpecifiesDueTime("kal shaam 5 baje")).toBe(true);
  });
});

describe("instructionSpecifiesDueDate", () => {
  it("accepts relative days, numeric dates, and month names", () => {
    expect(instructionSpecifiesDueDate("collect cash at 5:00 PM")).toBe(false);
    expect(instructionSpecifiesDueDate("collect cash today 5:00 PM")).toBe(true);
    expect(instructionSpecifiesDueDate("kal 5 baje collect karo")).toBe(true);
    expect(instructionSpecifiesDueDate("Due date 2nd September")).toBe(true);
    expect(instructionSpecifiesDueDate("start date 2 September")).toBe(true);
    expect(instructionSpecifiesDueDate("September 2nd")).toBe(true);
    expect(instructionSpecifiesDueDate("2nd Sept")).toBe(true);
    expect(instructionSpecifiesDueDate("26/08")).toBe(true);
  });
});

describe("parseCalendarDateFromInstruction", () => {
  it("reads 2nd September as 2 Sep 2026 at 5:00 PM IST", () => {
    const parsed = parseCalendarDateFromInstruction("Due date 2nd September", NOW);
    expect(istDay(parsed?.toISOString() ?? null)).toBe("2026-09-02");
    expect(istHour(parsed?.toISOString() ?? null)).toBe("17:00");
  });

  it("reads September 2nd and 2 Sept", () => {
    expect(
      istDay(
        parseCalendarDateFromInstruction("September 2nd", NOW)?.toISOString() ??
          null,
      ),
    ).toBe("2026-09-02");
    expect(
      istDay(
        parseCalendarDateFromInstruction("2nd Sept", NOW)?.toISOString() ?? null,
      ),
    ).toBe("2026-09-02");
  });
});

describe("resolveDueAtIso", () => {
  it("does not re-ask: date without time becomes 5:00 PM IST", () => {
    const iso = resolveDueAtIso(
      "Assign a task to AP to check stock of toothbrushes. Due date 2nd September",
      "",
      NOW,
    );
    expect(istDay(iso)).toBe("2026-09-02");
    expect(istHour(iso)).toBe("17:00");
  });

  it("keeps an explicit clock time", () => {
    const iso = resolveDueAtIso(
      "Assign AP to check stock due 2nd September 11:00 AM",
      "2026-09-02T11:00:00+05:30",
      NOW,
    );
    expect(istDay(iso)).toBe("2026-09-02");
    expect(istHour(iso)).toBe("11:00");
  });
});

describe("start date reminder window", () => {
  it("stays quiet until Start date even when Due is later", () => {
    const start = new Date("2026-09-01T03:30:00.000Z"); // 1 Sept 9:00 AM IST
    const due = new Date("2026-09-05T11:30:00.000Z");
    expect(shouldNotifyAssigneeNow(due, NOW, start)).toBe(false);
    expect(isReminderWindowOpen(due, NOW, start)).toBe(false);

    const onStartMorning = new Date("2026-09-01T04:00:00.000Z");
    expect(shouldNotifyAssigneeNow(due, onStartMorning, start)).toBe(true);
  });

  it("prefers labeled Start date over a wrong stored startAt", () => {
    const wrongStored = new Date("2026-08-26T03:30:00.000Z");
    const effective = resolveEffectiveStartAt({
      instructions:
        "Start date: 01/09\nDue date: 05/09\nTask details: Collect cash",
      storedStartAt: wrongStored,
      startAtIso: wrongStored.toISOString(),
      now: NOW,
    });
    expect(istDay(effective?.toISOString() ?? null)).toBe("2026-09-01");
    expect(isReminderWindowOpen(wrongStored, NOW, effective)).toBe(false);
  });

  it("parses Start date lines into 9:00 AM IST", () => {
    expect(extractLabeledStartDateText("Start date: 1st September")).toBe(
      "1st September",
    );
    const iso = resolveStartAtIso(
      "Assignee: AP\nStart date: 1st September\nDue date: 5th September",
      NOW,
    );
    expect(istDay(iso)).toBe("2026-09-01");
    expect(istHour(iso)).toBe("09:00");
  });
});
