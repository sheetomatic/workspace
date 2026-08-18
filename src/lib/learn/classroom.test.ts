import { describe, expect, it } from "vitest";
import {
  canTeacherOpenClassroom,
  classroomExpUnix,
  isClassroomLive,
  roomNameForSlot,
  studentClassPath,
  teacherClassPath,
} from "@/lib/learn/classroom";

describe("classroom helpers", () => {
  it("treats a started room as live until it is ended", () => {
    expect(
      isClassroomLive({
        classroomStartedAt: new Date(),
        classroomEndedAt: null,
      }),
    ).toBe(true);
    expect(
      isClassroomLive({
        classroomStartedAt: new Date(),
        classroomEndedAt: new Date(),
      }),
    ).toBe(false);
  });

  it("lets staff open a scheduled or live slot", () => {
    expect(canTeacherOpenClassroom({ status: "SCHEDULED" })).toBe(true);
    expect(canTeacherOpenClassroom({ status: "COMPLETED" })).toBe(false);
    expect(
      canTeacherOpenClassroom({
        status: "COMPLETED",
        classroomStartedAt: new Date().toISOString(),
        classroomEndedAt: null,
      }),
    ).toBe(true);
  });

  it("names the Daily room from the slot id", () => {
    expect(roomNameForSlot("cm123")).toBe("so-cm123");
    expect(teacherClassPath("cm123")).toBe("/app/leads/training/class/cm123");
    expect(studentClassPath("cm123")).toBe("/learn/class/cm123");
  });

  it("keeps the Daily room open past the slot end", () => {
    const endsAt = new Date("2026-08-18T04:00:00.000Z");
    const now = new Date("2026-08-18T03:00:00.000Z");
    expect(classroomExpUnix(endsAt, now)).toBeGreaterThan(
      Math.floor(endsAt.getTime() / 1000),
    );
  });
});
