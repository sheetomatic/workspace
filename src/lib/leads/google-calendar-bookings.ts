import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getGoogleCalendarReadAccessToken } from "@/lib/integrations/google-sheets-auth";
import { PRIMARY_ORG_SLUG } from "@/lib/platform";
import { matchesBookingTitle, parseCalendarBookingDescription } from "./calendar-booking-description";

export type CalendarEvent = {
  id?: string; status?: string; summary?: string; updated?: string; description?: string;
  start?: { dateTime?: string; timeZone?: string; date?: string };
  end?: { dateTime?: string; timeZone?: string; date?: string };
  attendees?: Array<{ email?: string; displayName?: string; organizer?: boolean; self?: boolean; resource?: boolean; responseStatus?: string }>;
  organizer?: { email?: string }; htmlLink?: string; hangoutLink?: string;
};
type EventPage = { items?: CalendarEvent[]; nextPageToken?: string; nextSyncToken?: string };
export type BookingSyncConfig = { organizationId: string; calendarId: string; titles: string[]; token?: string };

export function getBookingSyncConfig(env: Record<string, string | undefined> = process.env): BookingSyncConfig | null {
  if (env.GOOGLE_CALENDAR_SYNC_ENABLED !== "true") return null;
  const organizationId = env.GOOGLE_CALENDAR_ORGANIZATION_ID?.trim();
  const calendarId = env.GOOGLE_CALENDAR_ID?.trim();
  const token = env.GOOGLE_CALENDAR_ACCESS_TOKEN?.trim();
  let titles: unknown;
  try { titles = JSON.parse(env.GOOGLE_CALENDAR_BOOKING_TITLES_JSON ?? "[]"); } catch { throw new Error("booking_titles_invalid"); }
  const hasServiceAccount = Boolean(env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON?.trim() ||
    (env.GOOGLE_SHEETS_CLIENT_EMAIL?.trim() && env.GOOGLE_SHEETS_PRIVATE_KEY?.trim()));
  if (!organizationId || !calendarId || (!token && !hasServiceAccount) || !Array.isArray(titles) || !titles.length ||
      titles.length > 20 || titles.some(t => typeof t !== "string" || !t.trim() || t.length > 200)) throw new Error("calendar_configuration_incomplete");
  return { organizationId, calendarId, token, titles: [...new Set((titles as string[]).map(t => t.trim()))].sort() };
}

export function bookingId(...parts: string[]) {
  return "gcal_" + createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 40);
}

function safeGoogleLink(value: string | undefined, host: string) {
  try { const url = new URL(value ?? ""); return url.protocol === "https:" && url.hostname === host ? url.href : null; }
  catch { return null; }
}

/** Require RFC3339 offset; never interpret a booking using the server's local timezone. */
function instant(value: string | undefined) {
  if (!value || !/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const date = new Date(value); return Number.isFinite(date.getTime()) ? date : null;
}

export function normalizeBooking(event: CalendarEvent, titles: string[]) {
  const details = parseCalendarBookingDescription(event.description);
  if (!event.id || !event.summary || !matchesBookingTitle(event.summary, titles, details.customerName) || event.status === "cancelled") return null;
  const startsAt = instant(event.start?.dateTime), endsAt = instant(event.end?.dateTime);
  if (!startsAt || !endsAt || endsAt <= startsAt) return null;
  const attendees = event.attendees?.filter(a => a.email && !a.organizer && !a.self && !a.resource &&
    a.email.toLowerCase() !== event.organizer?.email?.toLowerCase()) ?? [];
  if (!attendees.length && !(details.customerName && details.customerPhone)) return null;
  const attendee = attendees.find(a => a.responseStatus !== "declined") ?? attendees[0];
  return {
    eventId: event.id, summary: event.summary.trim().slice(0, 200), startsAt, endsAt,
    attendeeName: details.customerName ?? attendee?.displayName?.slice(0, 160) ?? null,
    attendeeEmail: attendee?.email?.trim().toLowerCase().slice(0, 254) ?? null,
    attendeePhone: details.customerPhone,
    bookingNotes: details.notes,
    sourceTimeZone: event.start?.timeZone?.slice(0, 100) ?? null,
    status: attendees.length && attendees.every(a => a.responseStatus === "declined") ? "CANCELLED" : "CONFIRMED",
    providerUpdatedAt: instant(event.updated),
    calendarUrl: safeGoogleLink(event.htmlLink, "calendar.google.com"),
    meetUrl: safeGoogleLink(event.hangoutLink, "meet.google.com"),
  };
}

export class CalendarReadError extends Error {
  constructor(readonly status: number) { super(`calendar_http_${status}`); }
}

export async function readCalendarPage(config: BookingSyncConfig, cursor: { syncToken: string | null; pageToken: string | null }) {
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.calendarId)}/events`);
  // No timeMin/orderBy/q with incremental sync. The identical filter set is used on all pages.
  url.searchParams.set("showDeleted", "true"); url.searchParams.set("singleEvents", "true");
  url.searchParams.set("maxResults", "100");
  url.searchParams.set("fields", "items(id,status,summary,description,updated,start,end,attendees(email,displayName,organizer,self,resource,responseStatus),organizer(email),htmlLink,hangoutLink),nextPageToken,nextSyncToken");
  if (cursor.syncToken) url.searchParams.set("syncToken", cursor.syncToken);
  if (cursor.pageToken) url.searchParams.set("pageToken", cursor.pageToken);
  // Uses an already-authorized token only: no OAuth grants, new scopes, or Calendar writes.
  const token = config.token ?? await getGoogleCalendarReadAccessToken();
  if (!token) throw new Error("calendar_credentials_missing");
  const response = await fetch(url, { method: "GET", headers: { Authorization: `Bearer ${token}` },
    cache: "no-store", signal: AbortSignal.timeout(15_000), redirect: "error" });
  if (!response.ok) throw new CalendarReadError(response.status);
  const data = await response.json() as EventPage;
  if ((data.items && !Array.isArray(data.items)) || (!data.nextPageToken && !data.nextSyncToken)) throw new Error("calendar_response_invalid");
  return data;
}

async function applyEvent(tx: Prisma.TransactionClient, connectionId: string, event: CalendarEvent, titles: string[], fullSyncId: string | null) {
  if (!event.id) return;
  const id = bookingId(connectionId, event.id);
  const current = await tx.googleCalendarBooking.findUnique({ where: { id } });
  const updated = instant(event.updated);
  if (current?.providerUpdatedAt && updated && updated < current.providerUpdatedAt) {
    if (fullSyncId) await tx.googleCalendarBooking.update({ where: { id }, data: { seenFullSyncId: fullSyncId } });
    return;
  }
  if (event.status === "cancelled") {
    // Google tombstones can contain only id/status. Never require name/time to cancel a known booking.
    if (current) await tx.googleCalendarBooking.update({ where: { id }, data: {
      status: "CANCELLED", providerUpdatedAt: updated ?? current.providerUpdatedAt,
      seenFullSyncId: fullSyncId ?? current.seenFullSyncId,
    } });
    return;
  }
  const data = normalizeBooking(event, titles);
  if (!data) {
    if (current) await tx.googleCalendarBooking.update({ where: { id }, data: { status: "CANCELLED",
      seenFullSyncId: fullSyncId ?? current.seenFullSyncId, providerUpdatedAt: updated ?? current.providerUpdatedAt } });
    return;
  }
  await tx.googleCalendarBooking.upsert({ where: { id }, create: { id, connectionId, ...data, seenFullSyncId: fullSyncId },
    update: { ...data, seenFullSyncId: fullSyncId ?? current?.seenFullSyncId } });
}

export async function syncCalendarBookings(config = getBookingSyncConfig(), readPage = readCalendarPage) {
  const startedAt = Date.now();
  if (!config) return { enabled: false, processed: 0 };
  const org = await prisma.organization.findUnique({ where: { id: config.organizationId }, select: { slug: true } });
  if (org?.slug !== PRIMARY_ORG_SLUG) throw new Error("calendar_workspace_not_allowed");
  const id = bookingId(config.organizationId, config.calendarId), leaseId = randomUUID();
  const filterHash = bookingId("booking-description-v2", ...config.titles);
  await prisma.googleCalendarConnection.upsert({ where: { id },
    create: { id, organizationId: config.organizationId, calendarId: config.calendarId, filterHash, fullSyncId: randomUUID() }, update: {} });
  const lock = await prisma.googleCalendarConnection.updateMany({ where: { id,
    OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] },
    data: { leaseId, leaseUntil: new Date(Date.now() + 120_000) } });
  if (!lock.count) return { enabled: true, busy: true, processed: 0 };
  let processed = 0;
  try {
    let state = await prisma.googleCalendarConnection.findUniqueOrThrow({ where: { id } });
    if (state.filterHash !== filterHash) state = await prisma.googleCalendarConnection.update({ where: { id }, data: {
      filterHash, syncToken: null, pageToken: null, fullSyncId: randomUUID(),
    } });
    // Two bounded pages per run; persist the continuation only in the same transaction as its data.
    for (let pageNumber = 0; pageNumber < 2; pageNumber++) {
      if (pageNumber && Date.now() - startedAt > 25_000) break;
      const page = await readPage(config, state);
      state = await prisma.$transaction(async tx => {
        const owned = await tx.googleCalendarConnection.updateMany({ where: { id, leaseId, leaseUntil: { gt: new Date() } },
          data: { leaseUntil: new Date(Date.now() + 120_000) } });
        if (!owned.count) throw new Error("calendar_sync_lease_lost");
        for (const event of page.items ?? []) await applyEvent(tx, id, event, config.titles, state.fullSyncId);
        if (!page.nextPageToken && state.fullSyncId) {
          // Reconcile missing events only after a successful COMPLETE full sync, never on partial/error pages.
          await tx.googleCalendarBooking.updateMany({ where: { connectionId: id,
            OR: [{ seenFullSyncId: null }, { seenFullSyncId: { not: state.fullSyncId } }] }, data: { status: "CANCELLED" } });
        }
        return tx.googleCalendarConnection.update({ where: { id }, data: {
          pageToken: page.nextPageToken ?? null,
          ...(page.nextPageToken ? {} : { syncToken: page.nextSyncToken!, fullSyncId: null, lastSyncedAt: new Date() }),
          lastError: null,
        } });
      }, { timeout: 20_000 });
      processed += page.items?.length ?? 0;
      if (!page.nextPageToken) break;
    }
    return { enabled: true, processed, hasMore: Boolean(state.pageToken) };
  } catch (error) {
    const expired = error instanceof CalendarReadError && error.status === 410;
    await prisma.googleCalendarConnection.updateMany({ where: { id, leaseId }, data: {
      lastError: error instanceof CalendarReadError ? error.message : "calendar_sync_failed",
      ...(expired ? { syncToken: null, pageToken: null, fullSyncId: randomUUID() } : {}),
    } });
    throw error;
  } finally {
    await prisma.googleCalendarConnection.updateMany({ where: { id, leaseId }, data: { leaseId: null, leaseUntil: null } });
  }
}

function activeConnectionId(organizationId: string) {
  if (process.env.GOOGLE_CALENDAR_SYNC_ENABLED !== "true" ||
      process.env.GOOGLE_CALENDAR_ORGANIZATION_ID?.trim() !== organizationId || !process.env.GOOGLE_CALENDAR_ID?.trim()) return null;
  return bookingId(organizationId, process.env.GOOGLE_CALENDAR_ID.trim());
}

export async function googleCalendarSyncNotice(organizationId: string) {
  const id = activeConnectionId(organizationId);
  if (!id) return "Google Calendar booking sync is not activated for this workspace.";
  const state = await prisma.googleCalendarConnection.findUnique({ where: { id },
    select: { lastSyncedAt: true, lastError: true, pageToken: true } });
  const last = state?.lastSyncedAt?.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  if (state?.lastError) return `Google Calendar sync needs attention. Showing cached bookings${last ? `; last complete sync ${last} IST` : ""}.`;
  if (state?.pageToken) return "Google Calendar sync is in progress. Counts may be incomplete until all pages are imported.";
  return last ? `Google Calendar last complete sync: ${last} IST.` : "Google Calendar is configured but has not completed a sync yet.";
}

export async function listGoogleCalendarBookings(organizationId: string, from: Date) {
  // No new-table read until enabled/migrated; preserves existing production behaviour before activation.
  const connectionId = activeConnectionId(organizationId);
  if (!connectionId) return [];
  return prisma.googleCalendarBooking.findMany({ where: { connectionId, connection: { organizationId }, startsAt: { gte: from } },
    orderBy: { startsAt: "asc" } });
}

export async function countUpcomingGoogleCalendarBookings(organizationId: string, from: Date) {
  const connectionId = activeConnectionId(organizationId);
  if (!connectionId) return 0;
  return prisma.googleCalendarBooking.count({ where: { connectionId, connection: { organizationId }, startsAt: { gte: from }, status: "CONFIRMED" } });
}
