import { afterEach, describe, expect, it, vi } from "vitest";
import { CalendarReadError, getBookingSyncConfig, normalizeBooking, readCalendarPage, type CalendarEvent } from "./google-calendar-bookings";
import { countCrmMeetings, filterCrmMeetings, istYmd } from "./crm-meetings";

const event: CalendarEvent = { id: "event-1", summary: "Business consultation", status: "confirmed",
  start: { dateTime: "2026-10-20T20:00:00-04:00", timeZone: "America/New_York" },
  end: { dateTime: "2026-10-20T20:30:00-04:00" },
  attendees: [{ email: "host@example.test", organizer: true }, { email: "client@example.test", displayName: "Client" }],
  htmlLink: "https://calendar.google.com/calendar/event?eid=example", hangoutLink: "https://meet.google.com/abc-defg-hij" };
afterEach(() => vi.unstubAllGlobals());
describe("booking normalization and Calendar transport", () => {
  it("uses offsets, preserving source zone and converting CRM days to IST", () => {
    const row = normalizeBooking(event, ["Business consultation"])!;
    expect(row.startsAt.toISOString()).toBe("2026-10-21T00:00:00.000Z");
    expect(istYmd(row.startsAt)).toBe("2026-10-21");
    expect(row.sourceTimeZone).toBe("America/New_York");
  });
  it("handles DST offsets without using the server timezone", () => {
    const summer = normalizeBooking({ ...event, start: { dateTime: "2026-07-20T10:00:00-04:00" }, end: { dateTime: "2026-07-20T10:30:00-04:00" } }, [event.summary!]);
    const winter = normalizeBooking({ ...event, start: { dateTime: "2026-12-20T10:00:00-05:00" }, end: { dateTime: "2026-12-20T10:30:00-05:00" } }, [event.summary!]);
    expect(summer?.startsAt.getUTCHours()).toBe(14); expect(winter?.startsAt.getUTCHours()).toBe(15);
  });
  it("ignores availability, personal events, all-day blocks and offsetless dates", () => {
    expect(normalizeBooking(event, ["Different appointment"])).toBeNull();
    expect(normalizeBooking({ ...event, attendees: [] }, [event.summary!])).toBeNull();
    expect(normalizeBooking({ ...event, start: { date: "2026-10-20" } }, [event.summary!])).toBeNull();
    expect(normalizeBooking({ ...event, start: { dateTime: "2026-10-20T10:00:00" } }, [event.summary!])).toBeNull();
  });
  it("treats all customer declines as cancellation and rejects untrusted links", () => {
    const row = normalizeBooking({ ...event, attendees: [{ email: "client@example.test", responseStatus: "declined" }],
      htmlLink: "https://calendar.google.com.evil.test/a", hangoutLink: "javascript:alert(1)" }, [event.summary!]);
    expect(row?.status).toBe("CANCELLED"); expect(row?.calendarUrl).toBeNull(); expect(row?.meetUrl).toBeNull();
  });
  it("uses a verified Meet URL from Calendar location when hangoutLink is absent", () => {
    const row = normalizeBooking({ ...event, hangoutLink: undefined,
      location: "Video call: https://meet.google.com/mzm-cske-fpn" }, [event.summary!]);
    expect(row?.meetUrl).toBe("https://meet.google.com/mzm-cske-fpn");
  });
  it("excludes cancellations from every active count, but shows cancelled separately", () => {
    const rows = [{ ymd: "2026-10-20", completed: false }, { ymd: "2026-10-20", completed: false, cancelled: true }];
    const now = new Date("2026-10-20T10:00:00Z");
    expect(countCrmMeetings(rows, now)).toMatchObject({ today: 1, upcoming: 1, cancelled: 1, done: 0 });
    expect(filterCrmMeetings(rows, "today", { now })).toHaveLength(1);
    expect(filterCrmMeetings(rows, "cancelled", { now })).toHaveLength(1);
  });
  it("fails closed without explicit scope/calendar/title configuration", () => {
    expect(getBookingSyncConfig({})).toBeNull();
    expect(() => getBookingSyncConfig({ GOOGLE_CALENDAR_SYNC_ENABLED: "true" })).toThrow("configuration_incomplete");
  });
  it("performs only a bounded GET with existing token, consistent sync filters and no OAuth", async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ items: [], nextSyncToken: "next" })));
    vi.stubGlobal("fetch", request);
    await readCalendarPage({ organizationId: "org", calendarId: "booking@example.test", titles: [event.summary!], token: "fixture" }, { syncToken: "sync", pageToken: "page" });
    const [url, options] = request.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.origin).toBe("https://www.googleapis.com"); expect(url.searchParams.get("syncToken")).toBe("sync");
    expect(url.searchParams.get("showDeleted")).toBe("true"); expect(url.searchParams.has("timeMin")).toBe(false);
    expect(url.searchParams.get("conferenceDataVersion")).toBe("1");
    expect(url.searchParams.get("fields")).toContain("description");
    expect(options.method).toBe("GET"); expect(options.signal).toBeDefined(); expect(options.redirect).toBe("error");
  });
  it("reports expired sync tokens and permission failures without copying provider bodies", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("sensitive provider error", { status: 410 })));
    await expect(readCalendarPage({ organizationId: "org", calendarId: "cal", titles: ["Demo"], token: "fixture" }, { syncToken: "expired", pageToken: null })).rejects.toEqual(new CalendarReadError(410));
  });
});
