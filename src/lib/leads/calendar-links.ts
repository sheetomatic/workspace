/**
 * Best-effort calendar helpers for Demo scheduled leads.
 * No Google OAuth in repo — deep links + ICS download only (not full sync).
 */

export type LeadDemoCalendarInput = {
  leadName: string | null;
  company: string | null;
  requirement: string | null;
  meetingNotes: string | null;
  /** Demo / meeting start — typically nextFollowUpAt */
  startsAt: Date;
  durationMinutes?: number;
  /** Optional join link (Google Meet / Zoom) shown in calendar details. */
  meetUrl?: string | null;
  location?: string | null;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** UTC stamp for Google/ICS: YYYYMMDDTHHMMSSZ */
export function toIcsUtcStamp(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function eventTitle(input: LeadDemoCalendarInput): string {
  const who = input.leadName?.trim() || input.company?.trim() || "Lead";
  return `Demo — ${who}`;
}

function eventDetails(input: LeadDemoCalendarInput): string {
  const parts = [
    input.company?.trim() ? `Company: ${input.company.trim()}` : null,
    input.requirement?.trim() ? `Need: ${input.requirement.trim()}` : null,
    input.meetUrl?.trim() ? `Join: ${input.meetUrl.trim()}` : null,
    input.meetingNotes?.trim() ? `Notes: ${input.meetingNotes.trim()}` : null,
    "Created from Sheetomatic Leads",
  ].filter(Boolean);
  return parts.join("\n");
}

/** Google Calendar template URL (opens create form in browser). */
export function buildGoogleCalendarUrl(input: LeadDemoCalendarInput): string {
  const duration = input.durationMinutes ?? 45;
  const end = new Date(input.startsAt.getTime() + duration * 60_000);
  const dates = `${toIcsUtcStamp(input.startsAt)}/${toIcsUtcStamp(end)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: eventTitle(input),
    dates,
    details: eventDetails(input),
  });
  const location = input.location?.trim() || input.meetUrl?.trim();
  if (location) {
    params.set("location", location);
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Generic Google Calendar template URL for any titled event. */
export function buildGoogleCalendarEventUrl(params: {
  title: string;
  startsAt: Date;
  endsAt: Date;
  details?: string;
  location?: string;
}): string {
  const dates = `${toIcsUtcStamp(params.startsAt)}/${toIcsUtcStamp(params.endsAt)}`;
  const search = new URLSearchParams({
    action: "TEMPLATE",
    text: params.title,
    dates,
    details: params.details ?? "",
  });
  if (params.location?.trim()) {
    search.set("location", params.location.trim());
  }
  return `https://calendar.google.com/calendar/render?${search.toString()}`;
}

/** Outlook.com compose deep link (best-effort; Outlook desktop uses ICS). */
export function buildOutlookWebUrl(input: LeadDemoCalendarInput): string {
  const duration = input.durationMinutes ?? 45;
  const end = new Date(input.startsAt.getTime() + duration * 60_000);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: eventTitle(input),
    body: eventDetails(input),
    startdt: input.startsAt.toISOString(),
    enddt: end.toISOString(),
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

function icsEscape(s: string) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function icsMailto(email: string) {
  return `mailto:${email.trim().toLowerCase()}`;
}

/** ICS file body for download (Google / Outlook / Apple). */
export function buildDemoIcsContent(input: LeadDemoCalendarInput): string {
  const duration = input.durationMinutes ?? 45;
  const end = new Date(input.startsAt.getTime() + duration * 60_000);
  const uid = `lead-demo-${input.startsAt.getTime()}@sheetomatic.com`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sheetomatic//Leads//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsUtcStamp(new Date())}`,
    `DTSTART:${toIcsUtcStamp(input.startsAt)}`,
    `DTEND:${toIcsUtcStamp(end)}`,
    `SUMMARY:${icsEscape(eventTitle(input))}`,
    `DESCRIPTION:${icsEscape(eventDetails(input))}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export type MeetingInviteIcsInput = {
  title: string;
  startsAt: Date;
  durationMinutes: number;
  description?: string;
  location?: string | null;
  /** Stable id so updates replace the same event */
  uid: string;
  organizerEmail: string;
  organizerName?: string | null;
  attendeeEmail: string;
  attendeeName?: string | null;
  /** REQUEST = Yes/No/Maybe RSVP in Gmail/Outlook; PUBLISH = add-only */
  method?: "REQUEST" | "PUBLISH";
};

/**
 * Calendar invite (.ics) with RSVP so clients can Accept / Decline / Tentative
 * like a normal meeting invite.
 */
export function buildMeetingInviteIcs(input: MeetingInviteIcsInput): string {
  const duration = input.durationMinutes;
  const end = new Date(input.startsAt.getTime() + duration * 60_000);
  const method = input.method ?? "REQUEST";
  const organizerEmail = input.organizerEmail.trim().toLowerCase();
  const attendeeEmail = input.attendeeEmail.trim().toLowerCase();
  const organizerCn = icsEscape(
    input.organizerName?.trim() || organizerEmail,
  );
  const attendeeCn = icsEscape(input.attendeeName?.trim() || attendeeEmail);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sheetomatic//CRM Meetings//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `DTSTAMP:${toIcsUtcStamp(new Date())}`,
    `DTSTART:${toIcsUtcStamp(input.startsAt)}`,
    `DTEND:${toIcsUtcStamp(end)}`,
    `SUMMARY:${icsEscape(input.title)}`,
    `DESCRIPTION:${icsEscape(input.description?.trim() || "")}`,
  ];
  if (input.location?.trim()) {
    lines.push(`LOCATION:${icsEscape(input.location.trim())}`);
  }
  lines.push(
    `ORGANIZER;CN=${organizerCn}:${icsMailto(organizerEmail)}`,
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${attendeeCn}:${icsMailto(attendeeEmail)}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  );
  return lines.join("\r\n");
}

export function downloadIcsFilename(leadName: string | null): string {
  const slug = (leadName?.trim() || "demo")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `sheetomatic-demo-${slug || "lead"}.ics`;
}
