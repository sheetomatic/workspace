import { describe, expect, it } from "vitest";
import {
  buildClientReminderCopy,
  buildTeamReminderCopy,
  dueReminderOffsets,
  MEETING_REMINDER_SLACK_MS,
  meetingReminderPhrase,
} from "@/lib/leads/meeting-reminders";

const START = new Date("2026-10-06T10:00:00.000Z");
const BOOKED = new Date("2026-10-05T10:00:00.000Z");

describe("meeting reminder offsets", () => {
  it("names each interval", () => {
    expect(meetingReminderPhrase(240)).toBe("in 4 hours");
    expect(meetingReminderPhrase(60)).toBe("in 1 hour");
    expect(meetingReminderPhrase(30)).toBe("in 30 minutes");
    expect(meetingReminderPhrase(10)).toBe("in 10 minutes");
    expect(meetingReminderPhrase(0)).toBe("starting now");
  });

  it("fires 4h, 1h, 30m, 10m, and at the start, once each", () => {
    const offsets = [240, 60, 30, 10, 0];
    const seen: number[] = [];
    for (const offset of offsets) {
      const now = new Date(START.getTime() - offset * 60_000 + 60_000);
      const due = dueReminderOffsets({
        startsAt: START,
        createdAt: BOOKED,
        now,
        alreadySent: seen,
      });
      expect(due).toEqual([offset]);
      seen.push(offset);
      expect(
        dueReminderOffsets({
          startsAt: START,
          createdAt: BOOKED,
          now,
          alreadySent: seen,
        }),
      ).toEqual([]);
    }
  });

  it("skips an interval that was already past when the meeting was booked", () => {
    const createdAt = new Date(START.getTime() - 20 * 60_000);
    const now = new Date(START.getTime() - 15 * 60_000);
    expect(
      dueReminderOffsets({
        startsAt: START,
        createdAt,
        now,
        alreadySent: [],
      }),
    ).toEqual([]);
  });

  it("drops an offset once the slack window has passed", () => {
    const now = new Date(START.getTime() - 4 * 60 * 60_000 + MEETING_REMINDER_SLACK_MS + 1);
    expect(
      dueReminderOffsets({
        startsAt: START,
        createdAt: BOOKED,
        now,
        alreadySent: [],
      }),
    ).toEqual([]);
  });

  it("puts the join link in client and team reminders", () => {
    const meetUrl = "https://meet.google.com/axy-yorv-ofn";
    const client = buildClientReminderCopy({
      clientName: "Ketan Jain",
      organizationName: "Sheetomatic",
      whenLabel: "Tue, 6 Oct 2026, 03:30 PM – 04:15 PM IST",
      meetUrl,
      phrase: "in 10 minutes",
    });
    const team = buildTeamReminderCopy({
      clientLabel: "Ketan Jain",
      whenLabel: "Tue, 6 Oct 2026, 03:30 PM – 04:15 PM IST",
      meetUrl,
      phrase: "starting now",
    });
    expect(client.text).toContain(`Join: ${meetUrl}`);
    expect(client.html).toContain(`href="${meetUrl}"`);
    expect(team.text).toContain(`Join: ${meetUrl}`);
    expect(team.subject).toContain("starting now");
  });
});
