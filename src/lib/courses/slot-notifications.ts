import { prisma } from "@/lib/db";
import {
  COURSE_GOOGLE_CALENDAR_BOOKING_URL,
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

const OWNER_NOTIFY_EMAIL =
  process.env.COURSE_ENROLLMENT_NOTIFY_EMAIL?.trim() || "sheetomatic@gmail.com";
const OWNER_NOTIFY_PHONE =
  process.env.COURSE_ENROLLMENT_NOTIFY_PHONE?.trim() || "";

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
      inboundLead: { select: { organizationId: true } },
    },
  });
}

function resolveNotifyOrganizationId(enrollment: {
  organizationId: string | null;
  inboundLead: { organizationId: string } | null;
}) {
  return (
    enrollment.organizationId?.trim() ||
    enrollment.inboundLead?.organizationId?.trim() ||
    null
  );
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
    studentName: enrollment.name,
  });
  const cohortLabel = courseCohortLabel(
    enrollment.cohort,
    enrollment.weekdaysCsv,
  );
  const firstWhen = formatSlotWhen(first.startsAt);
  const total = enrollment._count.slots;
  const organizationId = resolveNotifyOrganizationId(enrollment);

  const clientText = buildClientMessage({
    name: enrollment.name,
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
    name: enrollment.name,
    phone: enrollment.phone,
    email: enrollment.email,
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
    const [clientMail, ownerMail] = await Promise.all([
      sendPlainEmail({
        toEmail: enrollment.email,
        subject: meetUrl
          ? `Your training schedule + Meet link — starts ${firstWhen}`
          : `Your training slots are booked — starts ${firstWhen}`,
        text: clientText,
      }),
      sendPlainEmail({
        toEmail: OWNER_NOTIFY_EMAIL,
        subject: `Slots booked — ${enrollment.name} · ${firstWhen}`,
        text: ownerText,
      }),
    ]);
    clientEmailSent = clientMail.sent;
    ownerEmailSent = ownerMail.sent;
    if (!clientMail.sent) {
      emailError =
        clientMail.reason === "not_configured"
          ? "Email is not configured on the server."
          : clientMail.detail || "Client email failed.";
    }
  }

  if (sendWhatsApp) {
    if (!organizationId) {
      whatsappError = "No workspace linked to this training enrollment.";
    } else if (!enrollment.phone?.trim()) {
      whatsappError = "Client phone is missing.";
    } else {
      const wa = await sendWhatsAppText({
        organizationId,
        toPhone: enrollment.phone,
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
        ? `WhatsApp sent to ${enrollment.phone}${meetUrl ? " (with Meet link)" : ""}`
        : `WhatsApp failed: ${whatsappError}`,
    );
  }
  if (sendEmail) {
    parts.push(
      clientEmailSent
        ? `Email sent to ${enrollment.email}${meetUrl ? " (with Meet link)" : ""}`
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
    phone: enrollment.phone,
    email: enrollment.email,
  };
}

/** WhatsApp-only schedule send (includes Meet link when set). */
export async function sendTrainingScheduleOnWhatsApp(enrollmentId: string) {
  return notifyTrainingSlotsBooked(enrollmentId, {
    email: false,
    whatsapp: true,
  });
}

/** Save Meet on enrollment + empty slots, then optionally notify the client. */
export async function saveTrainingMeetUrl(params: {
  enrollmentId: string;
  organizationId: string;
  meetUrl: string;
}) {
  const meetUrl = params.meetUrl.trim().slice(0, 500);
  if (!meetUrl || !/^https?:\/\//i.test(meetUrl)) {
    return {
      ok: false as const,
      message: "Enter a valid Meet URL starting with https://",
    };
  }

  const enrollment = await prisma.courseEnrollment.findFirst({
    where: {
      id: params.enrollmentId,
      organizationId: params.organizationId,
    },
    select: { id: true },
  });
  if (!enrollment) {
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
