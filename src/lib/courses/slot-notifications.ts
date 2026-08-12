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
import { getPrimaryOrganization } from "@/lib/platform";
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
    `Cohort: ${params.cohortLabel}`,
    `Time: ${params.sessionTimeLabel || courseEnrollmentSchedule.sessionTimeLabel}`,
    `Sessions: ${params.total} live classes`,
    `First session: ${params.firstWhen}`,
    params.meetUrl
      ? `Meet link: ${params.meetUrl}`
      : "Meet link: (trainer will share before the first session)",
    "",
    `Book / manage slots on Google Calendar: ${COURSE_GOOGLE_CALENDAR_BOOKING_URL}`,
    `Add first session: ${params.calendarUrl}`,
    `Enrollment status: ${params.bookUrl}`,
    "",
    "See you in class — Sheetomatic",
  ]
    .filter(Boolean)
    .join("\n");
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
    `Cohort: ${params.cohortLabel}`,
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

export async function notifyTrainingSlotsBooked(
  enrollmentId: string,
): Promise<TrainingNotifyResult> {
  const enrollment = await prisma.courseEnrollment.findUnique({
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
  if (!enrollment || enrollment.slots.length === 0) {
    return {
      ok: false,
      message: "No scheduled sessions to email.",
      meetUrl: null,
      clientEmailSent: false,
      ownerEmailSent: false,
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
    workspaceUrl: `${base}/app/my-space/training`,
    meetUrl,
  });

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

  const primary = await getPrimaryOrganization();
  if (primary) {
    await Promise.allSettled([
      sendWhatsAppText({
        organizationId: primary.id,
        toPhone: enrollment.phone,
        body: clientText,
      }),
      OWNER_NOTIFY_PHONE
        ? sendWhatsAppText({
            organizationId: primary.id,
            toPhone: OWNER_NOTIFY_PHONE,
            body: ownerText,
          })
        : Promise.resolve(),
    ]);
  }

  const clientEmailSent = clientMail.sent;
  const ownerEmailSent = ownerMail.sent;
  if (!clientEmailSent) {
    const detail =
      clientMail.reason === "not_configured"
        ? "Email is not configured on the server."
        : clientMail.detail || "Client email failed.";
    return {
      ok: false,
      message: detail,
      meetUrl,
      clientEmailSent,
      ownerEmailSent,
    };
  }

  return {
    ok: true,
    message: meetUrl
      ? `Schedule emailed to ${enrollment.email} with Meet link.`
      : `Schedule emailed to ${enrollment.email} (no Meet link set yet).`,
    meetUrl,
    clientEmailSent,
    ownerEmailSent,
  };
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
