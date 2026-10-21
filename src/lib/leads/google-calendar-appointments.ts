import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createGoogleCalendarReadClient } from "@/lib/integrations/google-sheets-auth";
import { leadPhoneDigits } from "@/lib/leads/contact-validation";
import { extractMeetUrl, startOfIstDay } from "@/lib/leads/crm-meetings";
import { PRIMARY_ORG_SLUG } from "@/lib/platform";

const SOURCE = "GOOGLE_APPOINTMENT";
const DAY = 86_400_000;

function config() {
  const calendarId = process.env.GOOGLE_APPOINTMENTS_CALENDAR_ID?.trim();
  const prefixes = (process.env.GOOGLE_APPOINTMENTS_TITLE_PREFIXES ??
    "Book Your Free Consultation Call|Requirement Understanding Session")
    .split("|").map((value) => value.trim()).filter(Boolean);
  return calendarId ? {
    calendarId,
    organizationSlug: process.env.GOOGLE_APPOINTMENTS_ORG_SLUG?.trim() || PRIMARY_ORG_SLUG,
    prefixes,
  } : null;
}

function lineValue(description: string, label: string) {
  const match = description.match(new RegExp(`(?:^|\\n)${label}:\\s*([^\\n]+)`, "i"));
  return match?.[1]?.replace(/\s+/g, " ").trim() || null;
}

function parseBookedBy(description: string) {
  const match = description.match(/\*\*Booked by\*\*\s+([^\n]+)/i);
  if (!match) return { name: null, email: null, phone: null };
  const email = match[1].match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] ?? null;
  const phone = match[1].match(/(?:\+?\d[\d\s().-]{8,}\d)/)?.[0] ?? null;
  const name = match[1].slice(0, Math.min(
    ...[email, phone].filter(Boolean).map((value) => match[1].indexOf(value!)),
    match[1].length,
  )).replace(/<[^>]*>/g, "").trim() || null;
  return { name, email, phone };
}

function parseAppointment(event: {
  id?: string | null; status?: string | null; summary?: string | null;
  description?: string | null; htmlLink?: string | null; hangoutLink?: string | null;
  location?: string | null; start?: { dateTime?: string | null }; attendees?: Array<{ email?: string | null }> | null;
}) {
  const settings = config();
  const title = event.summary?.trim() || "";
  if (!settings || !event.id || !settings.prefixes.some((prefix) => title.toLowerCase().includes(prefix.toLowerCase()))) return null;
  const scheduledAt = event.start?.dateTime ? new Date(event.start.dateTime) : null;
  if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) return null;
  const description = event.description ?? "";
  const bookedBy = parseBookedBy(description);
  const titleName = title.includes("|") ? title.split("|")[0]?.trim() : null;
  const name = lineValue(description, "Customer name") ?? bookedBy.name ?? titleName;
  const customerPhone = description.match(/(?:^|\n)Customer phone:\s*(\+?\d[\d\s().-]{8,}\d)/i)?.[1] ?? null;
  const phone = leadPhoneDigits(customerPhone ?? bookedBy.phone);
  const email = bookedBy.email ?? event.attendees?.find((item) => item.email)?.email ?? null;
  const requirement = lineValue(description, "Requirement Notes") ??
    lineValue(description, "Requirement in Detail") ?? lineValue(description, "Booking notes");
  const meetUrl = event.hangoutLink?.startsWith("https://meet.google.com/")
    ? event.hangoutLink : extractMeetUrl(`${event.location ?? ""}\n${description}`);
  const eventUrl = event.htmlLink?.startsWith("https://www.google.com/calendar/event?")
    ? event.htmlLink : null;
  return { id: event.id, title, scheduledAt,
    name, phone, email, requirement, meetUrl, eventUrl, description };
}

export async function syncGoogleCalendarAppointments(requestedOrganizationId?: string) {
  const settings = config();
  const calendar = createGoogleCalendarReadClient();
  if (!settings || !calendar) return { configured: false, synced: 0, skipped: 0 };
  const organization = await prisma.organization.findUnique({
    where: { slug: settings.organizationSlug }, select: { id: true },
  });
  if (!organization) return { configured: false, synced: 0, skipped: 0 };
  if (requestedOrganizationId && requestedOrganizationId !== organization.id) {
    return { configured: false, synced: 0, skipped: 0 };
  }
  const owner = await prisma.membership.findFirst({
    where: { organizationId: organization.id, deactivatedAt: null, role: { in: ["OWNER", "ADMIN"] } },
    orderBy: { createdAt: "asc" }, select: { userId: true },
  });
  const response = await calendar.events.list({
    calendarId: settings.calendarId, singleEvents: true, showDeleted: true,
    timeMin: new Date(startOfIstDay().getTime() - DAY).toISOString(),
    timeMax: new Date(Date.now() + 366 * DAY).toISOString(), maxResults: 2500, orderBy: "startTime",
  });
  let synced = 0;
  let skipped = 0;
  for (const raw of response.data.items ?? []) {
    if (raw.status === "cancelled" && raw.id) {
      await prisma.inboundLeadFollowUp.updateMany({
        where: { organizationId: organization.id, externalSource: SOURCE, externalId: raw.id, completedAt: null },
        data: { completedAt: new Date() },
      });
      continue;
    }
    const appointment = parseAppointment(raw);
    if (!appointment) continue;
    const existing = await prisma.inboundLeadFollowUp.findUnique({
      where: { organizationId_externalSource_externalId: {
        organizationId: organization.id, externalSource: SOURCE, externalId: appointment.id,
      } }, select: { id: true, leadId: true },
    });
    let leadId = existing?.leadId ?? null;
    if (!leadId && appointment.phone) {
      const match = await prisma.inboundLead.findFirst({
        where: { organizationId: organization.id, phone: { contains: appointment.phone.slice(-10) }, archivedAt: null, mergedIntoId: null },
        orderBy: { createdAt: "desc" }, select: { id: true },
      });
      leadId = match?.id ?? null;
    }
    if (!leadId && appointment.phone) {
      const lead = await prisma.inboundLead.upsert({
        where: { organizationId_channel_externalId: {
          organizationId: organization.id, channel: "GOOGLE_CALENDAR", externalId: appointment.id,
        } },
        create: {
        organizationId: organization.id, channel: "GOOGLE_CALENDAR", externalId: appointment.id,
        name: appointment.name || "Calendar appointment", phone: appointment.phone,
        email: appointment.email, requirement: appointment.requirement,
        meetingNotes: appointment.description.slice(0, 5000), sourceDetail: "Google Calendar appointment",
        status: "SCHEDULE_MEETING", assignedToId: owner?.userId, createdByUserId: owner?.userId,
        nextFollowUpAt: appointment.scheduledAt, capturedAt: new Date(),
        rawPayload: { calendarEventId: appointment.id, calendarEventUrl: appointment.eventUrl } as Prisma.InputJsonValue,
        }, update: {}, select: { id: true },
      });
      leadId = lead.id;
    }
    if (!leadId) { skipped += 1; continue; }
    await prisma.inboundLeadFollowUp.upsert({
      where: { organizationId_externalSource_externalId: {
        organizationId: organization.id, externalSource: SOURCE, externalId: appointment.id,
      } },
      create: { organizationId: organization.id, leadId, type: "MEETING", scheduledAt: appointment.scheduledAt,
        meetUrl: appointment.meetUrl, notes: appointment.requirement || appointment.title,
        assigneeUserId: owner?.userId, createdByUserId: owner?.userId,
        externalSource: SOURCE, externalId: appointment.id, externalUrl: appointment.eventUrl },
      update: { scheduledAt: appointment.scheduledAt, meetUrl: appointment.meetUrl,
        externalUrl: appointment.eventUrl, completedAt: null },
    });
    synced += 1;
  }
  return { configured: true, synced, skipped };
}
