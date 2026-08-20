import { describe, expect, it } from "vitest";
import { buildMeetingInviteIcs } from "@/lib/leads/calendar-links";
import {
  buildClientMeetingInviteEmail,
  extractMeetUrl,
  resolveMeetingJoinDetails,
} from "@/lib/leads/meeting-invite";
import { parseDatetimeLocalAsIst } from "@/lib/leads/ist-datetime";

describe("meeting invite ICS + HTML", () => {
  const startsAt = parseDatetimeLocalAsIst("2026-08-19T14:00")!;

  it("builds REQUEST ics with RSVP attendee", () => {
    const ics = buildMeetingInviteIcs({
      title: "Meeting with Sheetomatic",
      startsAt,
      durationMinutes: 30,
      uid: "test-uid@sheetomatic.com",
      organizerEmail: "host@sheetomatic.com",
      organizerName: "Shyam",
      attendeeEmail: "client@example.com",
      attendeeName: "Ketan",
      method: "REQUEST",
      location: "https://meet.google.com/axy-yorv-ofn",
    });
    expect(ics).toContain("METHOD:REQUEST");
    expect(ics).toContain("RSVP=TRUE");
    expect(ics).toContain("mailto:client@example.com");
    expect(ics).toContain("DTSTART:20260819T083000Z");
  });

  it("hyperlinks Add to your calendar in HTML", () => {
    const invite = buildClientMeetingInviteEmail({
      clientName: "Ketan",
      organizationName: "Sheetomatic",
      startsAt,
      durationMinutes: 30,
      meetUrl: "https://meet.google.com/axy-yorv-ofn",
      attendeeEmail: "client@example.com",
      organizerEmail: "host@sheetomatic.com",
    });
    expect(invite.html).toMatch(/href="[^"]*calendar\.google\.com[^"]*"[^>]*>Add to your calendar<\/a>/);
    expect(invite.html).toContain("Yes / No / Maybe");
    expect(invite.icsContent).toContain("METHOD:REQUEST");
    expect(invite.text).toContain("Add to your calendar:");
    expect(invite.calendarUrl).toContain("text=Meeting");
    expect(invite.text).toContain("is confirmed");
  });

  it("extracts a Meet link from follow-up notes", () => {
    expect(
      extractMeetUrl(
        "Client meeting scheduled (45 min) · https://meet.google.com/axy-yorv-ofn",
      ),
    ).toBe("https://meet.google.com/axy-yorv-ofn");
    expect(
      resolveMeetingJoinDetails({
        startsAt,
        notes: "Client meeting scheduled (45 min)",
      }).meetUrl,
    ).toBe("https://meet.google.com/axy-yorv-ofn");
  });
});
