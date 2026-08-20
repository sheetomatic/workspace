import {
  buildGoogleCalendarEventUrl,
  buildMeetingInviteIcs,
} from "@/lib/leads/calendar-links";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatMeetingWhenIst(startsAt: Date, durationMinutes: number) {
  const end = new Date(startsAt.getTime() + durationMinutes * 60_000);
  const dateLabel = startsAt.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  const startLabel = startsAt.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
  const endLabel = end.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
  return `${dateLabel}, ${startLabel} – ${endLabel} IST`;
}

export function buildClientMeetingInviteEmail(params: {
  clientName: string | null;
  organizationName: string;
  startsAt: Date;
  durationMinutes: number;
  meetUrl?: string | null;
  notes?: string | null;
  counsellorName?: string | null;
  /** Recipient of this invite (client or host copy) */
  attendeeEmail: string;
  /** Organizer mailbox — RSVP replies go here when possible */
  organizerEmail: string;
  organizerName?: string | null;
  /** Stable event id — reuse for host + client copies of the same meeting */
  eventUid?: string;
  title?: string;
}) {
  const when = formatMeetingWhenIst(params.startsAt, params.durationMinutes);
  const meetUrl = params.meetUrl?.trim() || null;
  const notes = params.notes?.trim() || null;
  const title =
    params.title?.trim() ||
    `Meeting — ${params.clientName?.trim() || params.organizationName}`;
  const endsAt = new Date(
    params.startsAt.getTime() + params.durationMinutes * 60_000,
  );
  const descriptionParts = [
    `Meeting with ${params.organizationName}`,
    meetUrl ? `Join: ${meetUrl}` : null,
    notes ? `Notes: ${notes}` : null,
  ].filter(Boolean);
  const calendarUrl = buildGoogleCalendarEventUrl({
    title,
    startsAt: params.startsAt,
    endsAt,
    details: descriptionParts.join("\n"),
    location: meetUrl ?? undefined,
  });
  const firstName =
    params.clientName?.trim().split(/\s+/)[0] || "there";
  const host = params.counsellorName?.trim() || params.organizationName;
  const uid =
    params.eventUid?.trim() ||
    `crm-meeting-${params.startsAt.getTime()}-${params.attendeeEmail
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 16)}@sheetomatic.com`;

  const icsContent = buildMeetingInviteIcs({
    title,
    startsAt: params.startsAt,
    durationMinutes: params.durationMinutes,
    description: descriptionParts.join("\n"),
    location: meetUrl,
    uid,
    organizerEmail: params.organizerEmail,
    organizerName: params.organizerName ?? params.organizationName,
    attendeeEmail: params.attendeeEmail,
    attendeeName: params.clientName,
    method: "REQUEST",
  });

  const text = [
    `Hi ${firstName},`,
    "",
    `Your meeting with ${params.organizationName} is scheduled.`,
    "",
    `When: ${when}`,
    meetUrl ? `Join link: ${meetUrl}` : null,
    notes ? `Notes: ${notes}` : null,
    "",
    `Add to your calendar: ${calendarUrl}`,
    "",
    "Calendar invite attached — use Yes / No / Maybe in your mail app to RSVP.",
    "",
    `Looking forward to speaking with you.`,
    "",
    `— ${host}`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const html = [
    `<p>Hi ${escapeHtml(firstName)},</p>`,
    `<p>Your meeting with <strong>${escapeHtml(params.organizationName)}</strong> is scheduled.</p>`,
    `<p><strong>When:</strong> ${escapeHtml(when)}</p>`,
    meetUrl
      ? `<p><strong>Join link:</strong> <a href="${escapeHtml(meetUrl)}">${escapeHtml(meetUrl)}</a></p>`
      : "",
    notes ? `<p><strong>Notes:</strong> ${escapeHtml(notes)}</p>` : "",
    `<p><a href="${escapeHtml(calendarUrl)}" style="display:inline-block;padding:10px 16px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600">Add to your calendar</a></p>`,
    `<p style="color:#555;font-size:14px">Calendar invite attached — use <strong>Yes / No / Maybe</strong> in Gmail or Outlook to RSVP.</p>`,
    `<p>Looking forward to speaking with you.</p>`,
    `<p>— ${escapeHtml(host)}</p>`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: `Meeting scheduled — ${params.organizationName}`,
    text,
    html,
    calendarUrl,
    whenLabel: when,
    icsContent,
    icsFilename: "sheetomatic-meeting.ics",
    eventUid: uid,
  };
}
