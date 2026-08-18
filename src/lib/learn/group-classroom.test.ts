import { describe, expect, it } from "vitest";
import {
  classroomMaxParticipants,
  earliestClassroomStartedAt,
  formatGroupRoster,
  groupClassIdentity,
  groupRoomToken,
  pickGroupSessionSlots,
  pickLiveGroupClassroom,
  roomNameForGroup,
  slotsShareSessionWindow,
} from "@/lib/learn/group-classroom";

describe("groupClassIdentity", () => {
  it("prefers groupKey over the Meet URL", () => {
    expect(
      groupClassIdentity({
        groupKey: "grp_ab12cd34ef56aa99",
        groupMeetUrl: "https://meet.google.com/aaa-bbbb-ccc",
      }),
    ).toEqual({ kind: "key", value: "grp_ab12cd34ef56aa99" });
  });

  it("falls back to a shared Meet URL", () => {
    expect(
      groupClassIdentity({
        groupKey: "  ",
        groupMeetUrl: "https://meet.google.com/aaa-bbbb-ccc",
      }),
    ).toEqual({
      kind: "url",
      value: "https://meet.google.com/aaa-bbbb-ccc",
    });
  });

  it("is empty for 1:1 enrollments", () => {
    expect(groupClassIdentity({ groupKey: null, groupMeetUrl: null })).toBeNull();
  });
});

describe("session window", () => {
  const six = {
    startsAt: new Date("2026-08-18T12:30:00.000Z"),
    endsAt: new Date("2026-08-18T14:00:00.000Z"),
  };
  const sixFifteen = {
    startsAt: new Date("2026-08-18T12:45:00.000Z"),
    endsAt: new Date("2026-08-18T14:15:00.000Z"),
  };
  const nextWeek = {
    startsAt: new Date("2026-08-25T12:30:00.000Z"),
    endsAt: new Date("2026-08-25T14:00:00.000Z"),
  };

  it("treats overlapping group slots as one session", () => {
    expect(slotsShareSessionWindow(six, sixFifteen)).toBe(true);
    expect(slotsShareSessionWindow(six, nextWeek)).toBe(false);
  });

  it("keeps only the window peers", () => {
    const picked = pickGroupSessionSlots(six, [six, sixFifteen, nextWeek]);
    expect(picked).toEqual([six, sixFifteen]);
  });
});

describe("group Daily room", () => {
  it("names a stable room from groupKey and start bucket", () => {
    const identity = { kind: "key" as const, value: "grp_ab12cd34ef56aa99" };
    const startsAt = new Date("2026-08-18T12:30:00.000Z");
    expect(roomNameForGroup(identity, startsAt)).toBe(
      `so-g-${groupRoomToken(identity)}-${Math.floor(startsAt.getTime() / (3 * 60 * 60 * 1000))}`,
    );
    expect(roomNameForGroup(identity, startsAt)).toMatch(/^so-g-grp-ab12cd34ef56aa99-\d+$/);
  });

  it("hashes a Meet URL so room names stay Daily-safe", () => {
    const identity = {
      kind: "url" as const,
      value: "https://meet.google.com/aaa-bbbb-ccc",
    };
    expect(groupRoomToken(identity)).toMatch(/^[a-f0-9]{16}$/);
    expect(roomNameForGroup(identity, new Date("2026-08-18T12:30:00.000Z"))).toMatch(
      /^so-g-[a-f0-9]{16}-\d+$/,
    );
  });

  it("raises the participant cap for a group and keeps 1:1 at 6", () => {
    expect(classroomMaxParticipants(1)).toBe(6);
    expect(classroomMaxParticipants(2)).toBe(12);
    expect(classroomMaxParticipants(10)).toBe(14);
    expect(classroomMaxParticipants(80)).toBe(40);
  });

  it("reuses an already-live group room", () => {
    const live = pickLiveGroupClassroom([
      {
        classroomRoomName: null,
        classroomUrl: null,
        classroomStartedAt: null,
        classroomEndedAt: null,
      },
      {
        classroomRoomName: "so-g-grp-1-1",
        classroomUrl: "https://sheetomatic.daily.co/so-g-grp-1-1",
        classroomStartedAt: new Date(),
        classroomEndedAt: null,
      },
    ]);
    expect(live?.classroomRoomName).toBe("so-g-grp-1-1");
  });

  it("treats a started Meet-only class as live", () => {
    const live = pickLiveGroupClassroom([
      {
        classroomRoomName: null,
        classroomUrl: null,
        classroomStartedAt: new Date(),
        classroomEndedAt: null,
      },
    ]);
    expect(live?.classroomStartedAt).toBeTruthy();
  });

  it("keeps the first start time when more students join the same room", () => {
    const first = new Date("2026-08-18T12:31:00.000Z");
    expect(
      earliestClassroomStartedAt(
        [{ classroomStartedAt: new Date("2026-08-18T12:40:00.000Z") }, { classroomStartedAt: first }],
        new Date("2026-08-18T13:00:00.000Z"),
      ),
    ).toEqual(first);
  });
});

describe("formatGroupRoster", () => {
  it("lists a small group and truncates a large one", () => {
    expect(formatGroupRoster(["Ada", "Bea"])).toBe("Ada, Bea");
    expect(formatGroupRoster(["Ada", "Bea", "Cal", "Dee"])).toBe("Ada, Bea + 2 more");
  });
});
