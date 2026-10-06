import { prisma } from "@/lib/db";
import { sendPlainEmail } from "@/lib/integrations/email";
import { logInboundLeadActivity } from "@/lib/leads/activity";
import { whatsAppPhoneDigits } from "@/lib/leads/contact-links";
import { DEFAULT_CLIENT_MEET_URL } from "@/lib/leads/meeting-defaults";
import {
  formatMeetingWhenIst,
  resolveMeetingJoinDetails,
} from "@/lib/leads/meeting-invite";
import { sendWhatsAppText } from "@/lib/whatsapp-bot/send";

/** Minutes before the meeting. 0 = at the start. */
export const MEETING_REMINDER_OFFSETS_MIN = [240, 60, 30, 10, 0] as const;

/** A 5-minute cron still catches each offset; smaller than the 10-minute gap. */
export const MEETING_REMINDER_SLACK_MS = 9 * 60_000;

export const MEETING_REMINDER_SCHEDULE_LINE =
  "Reminders go out 4 hours, 1 hour, 30 minutes, and 10 minutes before, and again when the meeting starts.";

export function meetingReminderPhrase(offsetMin: number) {
  switch (offsetMin) {
    case 240:
      return "in 4 hours";
    case 60:
      return "in 1 hour";
    case 30:
      return "in 30 minutes";
    case 10:
      return "in 10 minutes";
    case 0:
      return "starting now";
    default:
      return "soon";
  }
}

export function parseReminderMarks(raw: string | null | undefined) {
  if (!raw?.trim()) return [] as number[];
  return raw
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((value) => MEETING_REMINDER_OFFSETS_MIN.includes(value as 240));
}

export function formatReminderMarks(offsets: number[]) {
  return [...new Set(offsets)]
    .filter((value) => MEETING_REMINDER_OFFSETS_MIN.includes(value as 240))
    .sort((a, b) => b - a)
    .join(",");
}

export function durationMinutesFromMeetingNotes(notes: string | null | undefined) {
  const match = notes?.match(/\((\d+)\s*min\)/i);
  const minutes = match ? Number(match[1]) : 45;
  return minutes >= 15 && minutes <= 240 ? minutes : 45;
}

/**
 * Offsets whose moment has arrived, are still inside the slack window,
 * were not already past when the meeting was booked, and have not been sent.
 */
export function dueReminderOffsets(params: {
  startsAt: Date;
  createdAt: Date;
  now: Date;
  alreadySent: number[];
  slackMs?: number;
}) {
  const slack = params.slackMs ?? MEETING_REMINDER_SLACK_MS;
  const sent = new Set(params.alreadySent);
  const nowMs = params.now.getTime();
  const bookedAt = params.createdAt.getTime();
  return MEETING_REMINDER_OFFSETS_MIN.filter((offset) => {
    if (sent.has(offset)) return false;
    const dueAt = params.startsAt.getTime() - offset * 60_000;
    if (dueAt < bookedAt - 60_000) return false;
    return nowMs >= dueAt && nowMs < dueAt + slack;
  });
}

function usablePhone(phone: string | null | undefined) {
  const digits = whatsAppPhoneDigits(phone);
  return digits.length >= 10 ? phone!.trim() : null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildClientReminderCopy(params: {
  clientName: string | null;
  organizationName: string;
  whenLabel: string;
  meetUrl: string;
  phrase: string;
}) {
  const first = params.clientName?.trim().split(/\s+/)[0] || "there";
  const text = [
    `Hi ${first},`,
    "",
    `Reminder: your meeting with ${params.organizationName} is ${params.phrase}.`,
    "",
    `When: ${params.whenLabel}`,
    `Join: ${params.meetUrl}`,
    "",
    "Reply here if you need to reschedule.",
    "",
    `— ${params.organizationName}`,
  ].join("\n");
  const html = [
    `<p>Hi ${escapeHtml(first)},</p>`,
    `<p>Reminder: your meeting with <strong>${escapeHtml(params.organizationName)}</strong> is <strong>${escapeHtml(params.phrase)}</strong>.</p>`,
    `<p><strong>When:</strong> ${escapeHtml(params.whenLabel)}</p>`,
    `<p><strong>Join:</strong> <a href="${escapeHtml(params.meetUrl)}">${escapeHtml(params.meetUrl)}</a></p>`,
    `<p>Reply if you need to reschedule.</p>`,
  ].join("\n");
  return { text, html, subject: `Meeting ${params.phrase} — ${params.whenLabel}` };
}

export function buildTeamReminderCopy(params: {
  clientLabel: string;
  whenLabel: string;
  meetUrl: string;
  phrase: string;
}) {
  const text = [
    `Reminder: meeting with ${params.clientLabel} is ${params.phrase}.`,
    "",
    `When: ${params.whenLabel}`,
    `Join: ${params.meetUrl}`,
  ].join("\n");
  const html = [
    `<p>Reminder: meeting with <strong>${escapeHtml(params.clientLabel)}</strong> is <strong>${escapeHtml(params.phrase)}</strong>.</p>`,
    `<p><strong>When:</strong> ${escapeHtml(params.whenLabel)}</p>`,
    `<p><strong>Join:</strong> <a href="${escapeHtml(params.meetUrl)}">${escapeHtml(params.meetUrl)}</a></p>`,
  ].join("\n");
  return {
    text,
    html,
    subject: `Meeting with ${params.clientLabel} ${params.phrase}`,
  };
}

async function sendTextSafe(organizationId: string, toPhone: string, body: string) {
  try {
    return await sendWhatsAppText({ organizationId, toPhone, body });
  } catch {
    return { sent: false as const };
  }
}

const REMINDER_BATCH = 40;

/** Send due meeting reminders for every open meeting in the next 4 hours. */
export async function runDueMeetingReminders(now = new Date()) {
  const windowStart = new Date(now.getTime() - MEETING_REMINDER_SLACK_MS);
  const windowEnd = new Date(now.getTime() + 240 * 60_000 + 60_000);

  const rows = await prisma.inboundLeadFollowUp.findMany({
    where: {
      type: "MEETING",
      completedAt: null,
      scheduledAt: { gte: windowStart, lte: windowEnd },
      lead: { status: { notIn: ["WON", "LOST"] } },
    },
    orderBy: { scheduledAt: "asc" },
    take: REMINDER_BATCH,
    select: {
      id: true,
      organizationId: true,
      leadId: true,
      scheduledAt: true,
      createdAt: true,
      notes: true,
      meetUrl: true,
      reminderMarks: true,
      assigneeUserId: true,
      createdByUserId: true,
      lead: {
        select: {
          name: true,
          email: true,
          phone: true,
          company: true,
          nextFollowUpAt: true,
        },
      },
      organization: { select: { name: true } },
    },
  });

  let scanned = 0;
  let sent = 0;

  for (const row of rows) {
    const nextAt = row.lead.nextFollowUpAt?.getTime();
    if (nextAt != null && Math.abs(nextAt - row.scheduledAt.getTime()) > 2 * 60_000) {
      continue;
    }
    const due = dueReminderOffsets({
      startsAt: row.scheduledAt,
      createdAt: row.createdAt,
      now,
      alreadySent: parseReminderMarks(row.reminderMarks),
    });
    if (due.length === 0) continue;
    scanned += 1;

    const nextMarks = formatReminderMarks([
      ...parseReminderMarks(row.reminderMarks),
      ...due,
    ]);
    const claimed = await prisma.inboundLeadFollowUp.updateMany({
      where: { id: row.id, reminderMarks: row.reminderMarks },
      data: { reminderMarks: nextMarks },
    });
    if (claimed.count !== 1) continue;

    const duration = durationMinutesFromMeetingNotes(row.notes);
    const join = resolveMeetingJoinDetails({
      startsAt: row.scheduledAt,
      durationMinutes: duration,
      notes: row.notes,
      meetUrl: row.meetUrl || DEFAULT_CLIENT_MEET_URL,
    });
    const organizationName = row.organization.name?.trim() || "Sheetomatic";
    const clientLabel =
      row.lead.name?.trim() ||
      row.lead.company?.trim() ||
      row.lead.phone?.trim() ||
      "client";

    const teamIds = [...new Set([row.assigneeUserId, row.createdByUserId].filter(Boolean))] as string[];
    const teamUsers =
      teamIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: teamIds } },
            select: { email: true, phone: true },
          })
        : [];

    const clientPhone = usablePhone(row.lead.phone);
    const clientEmail = row.lead.email?.trim().toLowerCase() || null;
    let delivered = 0;
    const notes: string[] = [];

    for (const offset of due) {
      const phrase = meetingReminderPhrase(offset);
      const clientCopy = buildClientReminderCopy({
        clientName: row.lead.name,
        organizationName,
        whenLabel: join.whenLabel,
        meetUrl: join.meetUrl,
        phrase,
      });
      const teamCopy = buildTeamReminderCopy({
        clientLabel,
        whenLabel: join.whenLabel,
        meetUrl: join.meetUrl,
        phrase,
      });

      if (clientEmail) {
        const email = await sendPlainEmail({
          toEmail: clientEmail,
          subject: clientCopy.subject,
          text: clientCopy.text,
          html: clientCopy.html,
        });
        if (email.sent) {
          delivered += 1;
          notes.push(`email to client (${phrase})`);
        }
      }

      const teamEmails = [
        ...new Set(
          teamUsers
            .map((member) => member.email?.trim().toLowerCase())
            .filter((email): email is string => Boolean(email) && email !== clientEmail),
        ),
      ];
      for (const email of teamEmails) {
        const result = await sendPlainEmail({
          toEmail: email,
          subject: teamCopy.subject,
          text: teamCopy.text,
          html: teamCopy.html,
        });
        if (result.sent) {
          delivered += 1;
          notes.push(`email to ${email} (${phrase})`);
        }
      }

      if (clientPhone) {
        const wa = await sendTextSafe(row.organizationId, clientPhone, clientCopy.text);
        if (wa.sent) {
          delivered += 1;
          notes.push(`WhatsApp to client (${phrase})`);
        }
      }

      const teamPhones = [
        ...new Set(
          teamUsers
            .map((member) => usablePhone(member.phone))
            .filter((phone): phone is string => Boolean(phone) && phone !== clientPhone),
        ),
      ];
      for (const phone of teamPhones) {
        const wa = await sendTextSafe(row.organizationId, phone, teamCopy.text);
        if (wa.sent) {
          delivered += 1;
          notes.push(`WhatsApp to team (${phrase})`);
        }
      }
    }

    if (delivered === 0) {
      await prisma.inboundLeadFollowUp.updateMany({
        where: { id: row.id, reminderMarks: nextMarks },
        data: { reminderMarks: row.reminderMarks },
      });
      continue;
    }

    sent += 1;
    await logInboundLeadActivity({
      organizationId: row.organizationId,
      leadId: row.leadId,
      type: "MEETING",
      body: [`Meeting reminder · Join: ${join.meetUrl}`, ...notes].join(" · "),
      metadata: { meetingReminder: true, offsets: due, meetUrl: join.meetUrl },
    }).catch(() => undefined);
  }

  return { scanned: rows.length, reminded: scanned, sent };
}
