import { buildGoogleCalendarUrl } from "@/lib/leads/calendar-links";

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
}) {
  const when = formatMeetingWhenIst(params.startsAt, params.durationMinutes);
  const calendarUrl = buildGoogleCalendarUrl({
    leadName: params.clientName,
    company: null,
    requirement: null,
    meetingNotes: params.notes ?? null,
    startsAt: params.startsAt,
    durationMinutes: params.durationMinutes,
    meetUrl: params.meetUrl ?? null,
  });
  const firstName =
    params.clientName?.trim().split(/\s+/)[0] || "there";
  const host = params.counsellorName?.trim() || params.organizationName;

  const lines = [
    `Hi ${firstName},`,
    "",
    `Your meeting with *${params.organizationName}* is scheduled.`,
    "",
    `When: ${when}`,
    params.meetUrl?.trim() ? `Join link: ${params.meetUrl.trim()}` : null,
    params.notes?.trim() ? `Notes: ${params.notes.trim()}` : null,
    "",
    "Add this meeting to your calendar:",
    calendarUrl,
    "",
    `Looking forward to speaking with you.`,
    "",
    `— ${host}`,
  ].filter((line) => line !== null);

  return {
    subject: `Meeting scheduled — ${params.organizationName}`,
    text: lines.join("\n").replace(/\*/g, ""),
    calendarUrl,
    whenLabel: when,
  };
}
