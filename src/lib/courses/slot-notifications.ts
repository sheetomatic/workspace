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
}) {
  return [
    `Hi ${params.name}, your Sheetomatic 1:1 training slots are booked.`,
    "",
    `Cohort: ${params.cohortLabel}`,
    `Time: ${courseEnrollmentSchedule.sessionTimeLabel}`,
    `Sessions: ${params.total} live classes`,
    `First session: ${params.firstWhen}`,
    params.meetUrl ? `Meet link: ${params.meetUrl}` : null,
    "",
    `Add first session to Google Calendar: ${params.calendarUrl}`,
    `View / re-open booking: ${params.bookUrl}`,
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
    `Enrollment: ${params.enrollmentId}`,
    "",
    `Workspace: ${params.workspaceUrl}`,
  ].join("\n");
}

export async function notifyTrainingSlotsBooked(enrollmentId: string) {
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
    return;
  }

  const first = enrollment.slots[0]!;
  const base = getLoginBaseUrl();
  const bookUrl = enrollment.bookingToken
    ? `${base}/courses/book-slots?token=${enrollment.bookingToken}`
    : `${base}/courses`;
  const calendarUrl = buildTrainingGoogleCalendarUrl({
    title: first.title,
    startsAt: first.startsAt,
    endsAt: first.endsAt,
    meetUrl: first.meetUrl ?? enrollment.meetUrl,
    studentName: enrollment.name,
  });
  const cohortLabel = courseCohortLabel(enrollment.cohort);
  const firstWhen = formatSlotWhen(first.startsAt);
  const total = enrollment._count.slots;

  const clientText = buildClientMessage({
    name: enrollment.name,
    cohortLabel,
    firstWhen,
    total,
    bookUrl,
    calendarUrl,
    meetUrl: enrollment.meetUrl,
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
  });

  await Promise.allSettled([
    sendPlainEmail({
      toEmail: enrollment.email,
      subject: `Your training slots are booked — starts ${firstWhen}`,
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
}
