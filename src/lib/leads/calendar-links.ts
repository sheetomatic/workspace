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

/** ICS file body for download (Google / Outlook / Apple). */
export function buildDemoIcsContent(input: LeadDemoCalendarInput): string {
  const duration = input.durationMinutes ?? 45;
  const end = new Date(input.startsAt.getTime() + duration * 60_000);
  const uid = `lead-demo-${input.startsAt.getTime()}@sheetomatic.com`;
  const escape = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

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
    `SUMMARY:${escape(eventTitle(input))}`,
    `DESCRIPTION:${escape(eventDetails(input))}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function downloadIcsFilename(leadName: string | null): string {
  const slug = (leadName?.trim() || "demo")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `sheetomatic-demo-${slug || "lead"}.ics`;
}
