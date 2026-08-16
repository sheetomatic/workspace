import { prisma } from "@/lib/db";
import {
  courseCohortLabel,
  courseEnrollmentSchedule,
} from "@/lib/content/courses-enrollment";
import {
  buildTrainingGoogleCalendarUrl,
  formatSlotWhen,
} from "@/lib/courses/slots";
import { sendPlainEmail } from "@/lib/integrations/email";
import { getLoginBaseUrl } from "@/lib/integrations/email-base-url";
import { sendWhatsAppText } from "@/lib/whatsapp-bot/send";

/** Optional extra copy for ops — only if explicitly configured. Never default to sheetomatic@. */
const OWNER_NOTIFY_EMAIL = process.env.COURSE_ENROLLMENT_NOTIFY_EMAIL?.trim() || "";
const OWNER_NOTIFY_PHONE = process.env.COURSE_ENROLLMENT_NOTIFY_PHONE?.trim() || "";

function buildClientMessage(params: {
  name: string;
  cohortLabel: string;
  firstWhen: string;
  total: number;
  bookUrl: string;
  calendarUrl: string;
  meetUrl: string | null;
  sessionTimeLabel?: string;
}) {
  return [
    `Hi ${params.name}, your Sheetomatic 1:1 training slots are booked.`,
    "",
    `Days: ${params.cohortLabel}`,
    `Time: ${params.sessionTimeLabel || courseEnrollmentSchedule.sessionTimeLabel}`,
    `Sessions: ${params.total} live classes`,
    `First session: ${params.firstWhen}`,
    params.meetUrl
      ? `Google Meet: ${params.meetUrl}`
      : "Google Meet: (trainer will share before the first session)",
    "",
    `Add first session to calendar: ${params.calendarUrl}`,
    `Your booking page: ${params.bookUrl}`,
    "",
    "See you in class — Sheetomatic",
  ].join("\n");
}

function buildOwnerMessage(params: {
  name: string;
  phone: string;
  email: string;
  cohortLabel: string;
  firstWhen: string;
  total: number;
  enrollmentId: string;
  workspaceUrl: string;
  meetUrl: string | null;
}) {
  return [
    "Training course slots booked",
    "",
    `Student: ${params.name}`,
    `Phone: ${params.phone}`,
    `Email: ${params.email}`,
    `Days: ${params.cohortLabel}`,
    `First session: ${params.firstWhen}`,
    `Sessions: ${params.total}`,
    params.meetUrl ? `Meet: ${params.meetUrl}` : "Meet: NOT SET",
    `Enrollment: ${params.enrollmentId}`,
    "",
    `Workspace: ${params.workspaceUrl}`,
  ].join("\n");
}

export type TrainingNotifyResult = {
  ok: boolean;
  message: string;
  meetUrl: string | null;
  clientEmailSent: boolean;
  ownerEmailSent: boolean;
  clientWhatsAppSent: boolean;
  phone: string | null;
  email: string | null;
};

/** Resolve Meet link from enrollment or any scheduled slot. */
export function resolveTrainingMeetUrl(enrollment: {
  meetUrl?: string | null;
  slots?: Array<{ meetUrl?: string | null }>;
}): string | null {
  const fromEnrollment = enrollment.meetUrl?.trim() || null;
  if (fromEnrollment) return fromEnrollment;
  for (const slot of enrollment.slots ?? []) {
    const url = slot.meetUrl?.trim();
    if (url) return url;
  }
  return null;
}

async function loadEnrollmentForNotify(enrollmentId: string) {
  return prisma.courseEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      slots: {
        where: { status: "SCHEDULED" },
        orderBy: { sessionNumber: "asc" },
        take: 3,
      },
      _count: { select: { slots: true } },
    },
  });
}

function isValidEmail(value: string | null | undefined) {
  const email = value?.trim().toLowerCase() ?? "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

type NotifyChannels = {
  /** Default true */
  email?: boolean;
  /** Default true */
  whatsapp?: boolean;
};

/**
 * Send training schedule to the client.
 * WhatsApp uses the enrollment's workspace WhatsApp credentials (not primary org).
 */
export async function notifyTrainingSlotsBooked(
  enrollmentId: string,
  channels: NotifyChannels = {},
): Promise<TrainingNotifyResult> {
  const sendEmail = channels.email !== false;
  const sendWhatsApp = channels.whatsapp !== false;

  const enrollment = await loadEnrollmentForNotify(enrollmentId);
  if (!enrollment || enrollment.slots.length === 0) {
    return {
      ok: false,
      message: "No scheduled sessions to send.",
      meetUrl: null,
      clientEmailSent: false,
      ownerEmailSent: false,
      clientWhatsAppSent: false,
      phone: null,
      email: null,
    };
  }

  const lead = enrollment.inboundLeadId
    ? await prisma.inboundLead.findFirst({
        where: { id: enrollment.inboundLeadId },
        select: {
          organizationId: true,
          email: true,
          phone: true,
          name: true,
        },
      })
    : null;

  const clientEmail =
    isValidEmail(lead?.email) || isValidEmail(enrollment.email);
  const clientPhone = (lead?.phone || enrollment.phone || "").trim();
  const clientName = (lead?.name || enrollment.name || "there").trim();
  const organizationId =
    enrollment.organizationId?.trim() || lead?.organizationId?.trim() || null;

  if (
    clientEmail &&
    clientEmail !== (enrollment.email || "").trim().toLowerCase()
  ) {
    await prisma.courseEnrollment.update({
      where: { id: enrollment.id },
      data: { email: clientEmail },
    });
  }

  const meetUrl = resolveTrainingMeetUrl(enrollment);
  const first = enrollment.slots[0]!;
  const base = getLoginBaseUrl();
  const bookUrl = enrollment.bookingToken
    ? `${base}/courses/book-slots?token=${enrollment.bookingToken}`
    : `${base}/courses`;
  const calendarUrl = buildTrainingGoogleCalendarUrl({
    title: first.title,
    startsAt: first.startsAt,
    endsAt: first.endsAt,
    meetUrl: first.meetUrl ?? meetUrl,
    studentName: clientName,
  });
  const cohortLabel = courseCohortLabel(
    enrollment.cohort,
    enrollment.weekdaysCsv,
  );
  const firstWhen = formatSlotWhen(first.startsAt);
  const total = enrollment._count.slots;

  const clientText = buildClientMessage({
    name: clientName,
    cohortLabel,
    firstWhen,
    total,
    bookUrl,
    calendarUrl,
    meetUrl,
    sessionTimeLabel: enrollment.sessionTimeIst
      ? `${enrollment.sessionTimeIst} IST`
      : undefined,
  });
  const ownerText = buildOwnerMessage({
    name: clientName,
    phone: clientPhone,
    email: clientEmail || enrollment.email,
    cohortLabel,
    firstWhen,
    total,
    enrollmentId: enrollment.id,
    workspaceUrl: `${base}/app/leads/training`,
    meetUrl,
  });

  let clientEmailSent = false;
  let ownerEmailSent = false;
  let clientWhatsAppSent = false;
  let emailError: string | null = null;
  let whatsappError: string | null = null;

  if (sendEmail) {
    if (!clientEmail) {
      emailError = "Client email is missing on the lead.";
    } else {
      const clientMail = await sendPlainEmail({
        toEmail: clientEmail,
        subject: meetUrl
          ? `Your training schedule + Meet link — starts ${firstWhen}`
          : `Your training slots are booked — starts ${firstWhen}`,
        text: clientText,
      });
      clientEmailSent = clientMail.sent;
      if (!clientMail.sent) {
        emailError =
          clientMail.reason === "not_configured"
            ? "Email is not configured on the server."
            : clientMail.detail || "Client email failed.";
      }
    }

    // Internal copy only when explicitly configured — not sheetomatic@ by default.
    const ownerCopy =
      OWNER_NOTIFY_EMAIL &&
      OWNER_NOTIFY_EMAIL !== clientEmail &&
      !OWNER_NOTIFY_EMAIL.toLowerCase().includes("sheetomatic@gmail.com")
        ? OWNER_NOTIFY_EMAIL
        : "";
    if (ownerCopy) {
      const ownerMail = await sendPlainEmail({
        toEmail: ownerCopy,
        subject: `Slots booked — ${clientName} · ${firstWhen}`,
        text: ownerText,
      });
      ownerEmailSent = ownerMail.sent;
    }
  }

  if (sendWhatsApp) {
    if (!organizationId) {
      whatsappError = "No workspace linked to this training enrollment.";
    } else if (!clientPhone) {
      whatsappError = "Client phone is missing.";
    } else {
      const wa = await sendWhatsAppText({
        organizationId,
        toPhone: clientPhone,
        body: clientText,
      });
      clientWhatsAppSent = wa.sent;
      if (!wa.sent) {
        if (wa.reason === "not_configured") {
          whatsappError = "WhatsApp is not configured for this workspace.";
        } else if (wa.reason === "invalid_phone") {
          whatsappError = "Client phone number is invalid for WhatsApp.";
        } else if (wa.reason === "session_required") {
          whatsappError =
            "WhatsApp session required — client must message you first, or use Official API.";
        } else {
          whatsappError = wa.detail || `WhatsApp send failed (${wa.reason}).`;
        }
      }

      if (OWNER_NOTIFY_PHONE) {
        await sendWhatsAppText({
          organizationId,
          toPhone: OWNER_NOTIFY_PHONE,
          body: ownerText,
        }).catch(() => undefined);
      }
    }
  }

  const parts: string[] = [];
  if (sendWhatsApp) {
    parts.push(
      clientWhatsAppSent
        ? `WhatsApp sent to ${clientPhone}${meetUrl ? " (with Meet link)" : ""}`
        : `WhatsApp failed: ${whatsappError}`,
    );
  }
  if (sendEmail) {
    parts.push(
      clientEmailSent
        ? `Email sent to ${clientEmail}${meetUrl ? " (with Meet link)" : ""}`
        : `Email failed: ${emailError}`,
    );
  }

  const requestedOk =
    (sendWhatsApp && clientWhatsAppSent) || (sendEmail && clientEmailSent);

  // Prefer WhatsApp success when both were requested (clients often miss email).
  const ok =
    sendWhatsApp && !sendEmail
      ? clientWhatsAppSent
      : sendEmail && !sendWhatsApp
        ? clientEmailSent
        : requestedOk;

  return {
    ok,
    message: parts.join(" · ") || "Nothing sent.",
    meetUrl,
    clientEmailSent,
    ownerEmailSent,
    clientWhatsAppSent,
    phone: clientPhone || null,
    email: clientEmail,
  };
}

/** WhatsApp-only schedule send (includes Meet link when set). */
export async function sendTrainingScheduleOnWhatsApp(enrollmentId: string) {
  return notifyTrainingSlotsBooked(enrollmentId, {
    email: false,
    whatsapp: true,
  });
}

/** Accept pasted Meet links (spaces, zero-width chars, missing https). */
export function normalizeTrainingMeetUrl(raw: string | null | undefined): string | null {
  let value = String(raw ?? "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
  if (!value) return null;

  const extracted = value.match(/https?:\/\/[^\s<>"']+/i)?.[0];
  if (extracted) {
    value = extracted;
  } else if (/^(meet\.google\.com|zoom\.us)\//i.test(value)) {
    value = `https://${value}`;
  }

  value = value.replace(/[.,);]+$/g, "").slice(0, 500);
  if (!/^https:\/\/(meet\.google\.com|zoom\.us)\//i.test(value)) {
    return null;
  }
  return value;
}

/** Save Meet on enrollment + empty slots, then optionally notify the client. */
export async function saveTrainingMeetUrl(params: {
  enrollmentId: string;
  organizationId: string;
  meetUrl: string;
}) {
  const meetUrl = normalizeTrainingMeetUrl(params.meetUrl);
  if (!meetUrl) {
    return {
      ok: false as const,
      message: "Enter a valid Google Meet link (https://meet.google.com/…).",
    };
  }

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { id: params.enrollmentId },
    select: { id: true, organizationId: true, inboundLeadId: true },
  });
  if (!enrollment) {
    return { ok: false as const, message: "Training enrollment not found." };
  }
  const sameOrg = enrollment.organizationId === params.organizationId;
  const leadInOrg = enrollment.inboundLeadId
    ? await prisma.inboundLead.findFirst({
        where: {
          id: enrollment.inboundLeadId,
          organizationId: params.organizationId,
        },
        select: { id: true },
      })
    : null;
  if (!sameOrg && !leadInOrg) {
    return { ok: false as const, message: "Training enrollment not found." };
  }

  await prisma.$transaction([
    prisma.courseEnrollment.update({
      where: { id: enrollment.id },
      data: { meetUrl },
    }),
    prisma.trainingCourseSlot.updateMany({
      where: {
        enrollmentId: enrollment.id,
        OR: [{ meetUrl: null }, { meetUrl: "" }],
      },
      data: { meetUrl },
    }),
  ]);

  return { ok: true as const, meetUrl, message: "Meet link saved." };
}
