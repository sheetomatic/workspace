import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { bookingId, CalendarReadError, countUpcomingGoogleCalendarBookings, googleCalendarSyncNotice, syncCalendarBookings, type BookingSyncConfig, type CalendarEvent } from "./google-calendar-bookings";
import { getCrmMeetingsStats, getCrmModuleNavCounts, listCrmMeetings } from "./crm-module-stats";
import { GET } from "@/app/api/cron/google-calendar-bookings/route";

vi.mock("@/lib/platform", () => ({ PRIMARY_ORG_SLUG: "calendar-integration-only" }));
const run = randomBytes(6).toString("hex"), orgId = `calendar-test-${run}`;
const config: BookingSyncConfig = { organizationId: orgId, calendarId: "bookings@example.test", titles: ["Business consultation"], token: "fixture-not-live" };
const connectionId = bookingId(orgId, config.calendarId);
const base: CalendarEvent = { id: "event-one", summary: "Business consultation", status: "confirmed", updated: "2026-10-20T04:00:00Z",
  start: { dateTime: "2026-10-20T10:00:00+05:30", timeZone: "Asia/Kolkata" }, end: { dateTime: "2026-10-20T10:30:00+05:30" },
  attendees: [{ email: "client@example.test", displayName: "Client" }], htmlLink: "https://calendar.google.com/calendar/event?eid=one" };
const page = (items: CalendarEvent[], token = "sync-one") => vi.fn(async (config: BookingSyncConfig, cursor: { syncToken: string | null; pageToken: string | null }) => {
  void config; void cursor; return { items, nextSyncToken: token };
});
const local = process.env.DATABASE_URL === "postgresql://postgres@127.0.0.1:55439/template_checkout_test";

describe.skipIf(!local)("Calendar bookings → actual CRM records and counts (local PostgreSQL)", () => {
  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-20T04:00:00Z"));
    await prisma.organization.create({ data: { id: orgId, name: "Calendar test only", slug: "calendar-integration-only" } });
  });
  beforeEach(async () => {
    await prisma.googleCalendarConnection.deleteMany({ where: { organizationId: orgId } });
    vi.stubEnv("GOOGLE_CALENDAR_SYNC_ENABLED", "true"); vi.stubEnv("GOOGLE_CALENDAR_ORGANIZATION_ID", orgId);
    vi.stubEnv("GOOGLE_CALENDAR_ID", config.calendarId);
  });
  afterAll(async () => { await prisma.organization.deleteMany({ where: { id: orgId } }); vi.unstubAllEnvs(); vi.useRealTimers(); await prisma.$disconnect(); });
  it("imports a booking once, appears in Meetings, and repeated sync does not inflate counts", async () => {
    await syncCalendarBookings(config, page([base])); await syncCalendarBookings(config, page([base], "sync-two"));
    expect(await prisma.googleCalendarBooking.count({ where: { connectionId } })).toBe(1);
    const rows = await listCrmMeetings(orgId); expect(rows).toHaveLength(1);
    expect(rows[0].source).toBe("GOOGLE_CALENDAR"); expect(rows[0].lead.id).toBeNull();
    const stats = await getCrmMeetingsStats(orgId); expect(stats.today).toBe(1); expect(stats.done).toBe(0);
    expect(await countUpcomingGoogleCalendarBookings(orgId, new Date("2026-10-20T00:00:00Z"))).toBe(1);
    expect((await getCrmModuleNavCounts(orgId)).meetings).toBe(1);
    expect(await googleCalendarSyncNotice(orgId)).toContain("last complete sync");
    expect(await prisma.inboundLead.count({ where: { organizationId: orgId } })).toBe(0);
    expect(await prisma.inboundLeadFollowUp.count({ where: { organizationId: orgId } })).toBe(0);
    expect(await prisma.waMessage.count({ where: { organizationId: orgId } })).toBe(0);
  });
  it("updates a reschedule in place, including midnight/timezone changes", async () => {
    await syncCalendarBookings(config, page([base]));
    await syncCalendarBookings(config, page([{ ...base, updated: "2026-10-20T05:00:00Z",
      start: { dateTime: "2026-10-20T20:00:00-04:00", timeZone: "America/New_York" }, end: { dateTime: "2026-10-20T20:30:00-04:00" } }]));
    const rows = await listCrmMeetings(orgId); expect(rows).toHaveLength(1);
    expect(rows[0].scheduledAt.toISOString()).toBe("2026-10-21T00:00:00.000Z");
    expect((await getCrmMeetingsStats(orgId)).today).toBe(0);
  });
  it("persists phone-based named bookings and exposes customer details in CRM without creating leads", async () => {
    const named = { ...base, summary: "Bhaskar | Business consultation", attendees: undefined,
      description: "Customer name: Bhaskar\nCustomer phone: +91 98765 43210\nRequirement Notes: WhatsApp task assignment\nLocation: Video call" };
    await syncCalendarBookings(config, page([named])); await syncCalendarBookings(config, page([named]));
    const rows = await listCrmMeetings(orgId);
    expect(rows).toHaveLength(1); expect(rows[0].lead.name).toBe("Bhaskar");
    expect(rows[0].lead.phone).toBe("+919876543210"); expect(rows[0].notes).toContain("Requirement: WhatsApp task assignment");
    expect((await getCrmModuleNavCounts(orgId)).meetings).toBe(1);
    expect(await prisma.inboundLead.count({ where: { organizationId: orgId } })).toBe(0);
    await syncCalendarBookings(config, page([{ ...named, updated: "2026-10-20T05:00:00Z", description: "Customer name: Bhaskar\nCustomer phone: +91 98765 43210" }]));
    expect((await listCrmMeetings(orgId))[0].notes).not.toContain("task assignment");
    await syncCalendarBookings(config, page([{ id: named.id, status: "cancelled" }]));
    expect((await getCrmModuleNavCounts(orgId)).meetings).toBe(0);
  });
  it("handles minimal cancellation tombstones, removes active counts, and ignores older updates", async () => {
    await syncCalendarBookings(config, page([base]));
    await syncCalendarBookings(config, page([{ id: base.id, status: "cancelled", updated: "2026-10-20T05:00:00Z" }]));
    await syncCalendarBookings(config, page([base]));
    const stats = await getCrmMeetingsStats(orgId); expect(stats.today).toBe(0); expect(stats.cancelled).toBe(1); expect(stats.done).toBe(0);
  });
  it("handles a cancel/rebook with a new event ID as one active booking", async () => {
    await syncCalendarBookings(config, page([base]));
    await syncCalendarBookings(config, page([{ id: base.id, status: "cancelled" }, { ...base, id: "replacement" }]));
    const stats = await getCrmMeetingsStats(orgId); expect(stats.today).toBe(1); expect(stats.cancelled).toBe(1);
  });
  it("reconciles a 410/full-sync reset only after all pages complete", async () => {
    await syncCalendarBookings(config, page([base, { ...base, id: "missing-later" }]));
    await expect(syncCalendarBookings(config, async () => { throw new CalendarReadError(410); })).rejects.toThrow("410");
    expect(await prisma.googleCalendarBooking.count({ where: { connectionId, status: "CONFIRMED" } })).toBe(2);
    const paginated = vi.fn().mockResolvedValueOnce({ items: [base], nextPageToken: "page-2" }).mockRejectedValueOnce(new Error("interrupted"));
    await expect(syncCalendarBookings(config, paginated)).rejects.toThrow("interrupted");
    expect(await prisma.googleCalendarBooking.count({ where: { connectionId, status: "CONFIRMED" } })).toBe(2);
    const resumed = page([], "fresh-token"); await syncCalendarBookings(config, resumed);
    expect(resumed.mock.calls[0][1]).toMatchObject({ pageToken: "page-2", syncToken: null });
    expect(await prisma.googleCalendarBooking.count({ where: { connectionId, status: "CONFIRMED" } })).toBe(1);
  });
  it("keeps data and cursor on authorization failures and scopes records to the workspace", async () => {
    await syncCalendarBookings(config, page([base]));
    await expect(syncCalendarBookings(config, async () => { throw new CalendarReadError(403); })).rejects.toThrow("403");
    expect((await getCrmMeetingsStats(orgId)).today).toBe(1);
    expect(await listCrmMeetings("unrelated-tenant")).toEqual([]);
    const state = await prisma.googleCalendarConnection.findUniqueOrThrow({ where: { id: connectionId } });
    expect(state.lastError).toBe("calendar_http_403"); expect(state.syncToken).toBe("sync-one");
    expect(await googleCalendarSyncNotice(orgId)).toContain("Showing cached bookings");
    const reader = page([base]); await expect(syncCalendarBookings({ ...config, organizationId: "unknown" }, reader)).rejects.toThrow("workspace_not_allowed");
    expect(reader).not.toHaveBeenCalled();
  });
  it("serializes concurrent workers with a lease", async () => {
    await syncCalendarBookings(config, page([]));
    await prisma.googleCalendarConnection.update({ where: { id: connectionId }, data: { leaseId: "other-worker", leaseUntil: new Date(Date.now() + 60_000) } });
    const reader = page([base]); expect(await syncCalendarBookings(config, reader)).toMatchObject({ busy: true });
    expect(reader).not.toHaveBeenCalled();
  });
  it("does not display bookings from a previously configured calendar", async () => {
    await syncCalendarBookings(config, page([base]));
    vi.stubEnv("GOOGLE_CALENDAR_ID", "different-calendar@example.test");
    expect(await listCrmMeetings(orgId)).toEqual([]);
    expect(await countUpcomingGoogleCalendarBookings(orgId, new Date("2026-10-20T00:00:00Z"))).toBe(0);
    expect(await googleCalendarSyncNotice(orgId)).toContain("has not completed a sync");
  });
  it("requires cron authentication and stays inert when disabled", async () => {
    vi.stubEnv("CRON_SECRET", ""); expect((await GET(new Request("https://example.test/cron"))).status).toBe(503);
    vi.stubEnv("CRON_SECRET", "local-secret"); expect((await GET(new Request("https://example.test/cron"))).status).toBe(401);
    vi.stubEnv("GOOGLE_CALENDAR_SYNC_ENABLED", "false");
    const response = await GET(new Request("https://example.test/cron", { headers: { Authorization: "Bearer local-secret" } }));
    expect(await response.json()).toEqual({ enabled: false, processed: 0 });
  });
});
