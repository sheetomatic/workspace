import { describe, expect, it } from "vitest";
import {
  attendanceButtonId,
  parseAttendanceButtonId,
  parseAttendanceTextChoice,
} from "@/lib/hr/attendance-whatsapp";

describe("attendance WhatsApp buttons", () => {
  it("builds and parses stable button ids", () => {
    const id = attendanceButtonId("late", "2026-09-09");
    expect(id).toBe("att:late:2026-09-09");
    expect(parseAttendanceButtonId(id)).toEqual({
      choice: "late",
      workDateYmd: "2026-09-09",
    });
    expect(parseAttendanceButtonId("att:present:2026-09-09")?.choice).toBe(
      "present",
    );
    expect(parseAttendanceButtonId("att:absent:2026-09-09")?.choice).toBe(
      "absent",
    );
    expect(parseAttendanceButtonId("task:done:xyz")).toBeNull();
  });

  it("parses plain-text Present / Late / Absent replies", () => {
    expect(parseAttendanceTextChoice("Present")).toBe("present");
    expect(parseAttendanceTextChoice("LATE")).toBe("late");
    expect(parseAttendanceTextChoice("absent!")).toBe("absent");
    expect(parseAttendanceTextChoice("hello")).toBeNull();
  });
});
