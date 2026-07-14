import type { CourseCohort, CourseEnrollmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendPlainEmail } from "@/lib/integrations/email";
import {
  COURSE_ENROLLMENT_PRICE_INR,
  courseCohortLabel,
  courseEnrollmentSchedule,
  type CourseCohortId,
} from "@/lib/content/courses-enrollment";
import { getLoginBaseUrl } from "@/lib/integrations/email-base-url";

const OWNER_NOTIFY_EMAIL =
  process.env.COURSE_ENROLLMENT_NOTIFY_EMAIL?.trim() || "sheetomatic@gmail.com";

export type CreateCourseEnrollmentInput = {
  name: string;
  phone: string;
  email: string;
  cohort: CourseCohortId;
  slotNotes?: string;
};

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "").trim();
}

export function isValidCourseCohort(value: string): value is CourseCohortId {
  return value === "MON_FRI" || value === "TUE_SAT";
}

export async function createCourseEnrollment(input: CreateCourseEnrollmentInput) {
  const name = input.name.trim().slice(0, 120);
  const email = input.email.trim().toLowerCase().slice(0, 200);
  const phone = normalizePhone(input.phone).slice(0, 32);
  const slotNotes = input.slotNotes?.trim().slice(0, 500) || null;

  if (!name || name.length < 2) {
    return { ok: false as const, error: "Please enter your full name." };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false as const, error: "Please enter a valid email." };
  }
  if (!phone || phone.replace(/\D/g, "").length < 10) {
    return { ok: false as const, error: "Please enter a valid phone number." };
  }
  if (!isValidCourseCohort(input.cohort)) {
    return { ok: false as const, error: "Please choose a cohort schedule." };
  }

  const { newBookingToken } = await import("@/lib/courses/slots");
  const enrollment = await prisma.courseEnrollment.create({
    data: {
      name,
      email,
      phone,
      cohort: input.cohort as CourseCohort,
      amountInr: COURSE_ENROLLMENT_PRICE_INR,
      status: "PAYMENT_PENDING",
      slotNotes,
      bookingToken: newBookingToken(),
    },
  });

  void notifyOwnerOfCourseEnrollment(enrollment.id).catch(() => {
    // Non-blocking — buyer still gets WhatsApp confirmation path.
  });

  return { ok: true as const, enrollment };
}

async function notifyOwnerOfCourseEnrollment(enrollmentId: string) {
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { id: enrollmentId },
  });
  if (!enrollment) {
    return;
  }

  const base = getLoginBaseUrl();
  const text = [
    "New Sheets | AppSheet | Looker 1:1 enrollment (payment pending confirmation)",
    "",
    `Name: ${enrollment.name}`,
    `Phone: ${enrollment.phone}`,
    `Email: ${enrollment.email}`,
    `Amount: ₹${enrollment.amountInr.toLocaleString("en-IN")}`,
    `Cohort: ${courseCohortLabel(enrollment.cohort)}`,
    `Time: ${courseEnrollmentSchedule.sessionTimeLabel}`,
    `ID: ${enrollment.id}`,
    "",
    `Confirm in Workspace Approvals: ${base}/app/approvals`,
    "Buyer will also share UPI payment screenshot on WhatsApp.",
  ].join("\n");

  await sendPlainEmail({
    toEmail: OWNER_NOTIFY_EMAIL,
    subject: `Sheets/AppSheet/Looker enrollment pending — ${enrollment.name}`,
    text,
  });
}

export async function listPendingCourseEnrollments() {
  return prisma.courseEnrollment.findMany({
    where: { status: "PAYMENT_PENDING" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function listRecentCourseEnrollments(limit = 30) {
  return prisma.courseEnrollment.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function confirmCourseEnrollment(params: {
  enrollmentId: string;
  confirmedById: string;
  /** When set, generate 24 training slots and alert client + owner. */
  programStartYmd?: string;
  meetUrl?: string | null;
}) {
  const existing = await prisma.courseEnrollment.findUnique({
    where: { id: params.enrollmentId },
    include: { slots: { select: { id: true }, take: 1 } },
  });
  if (!existing) {
    return { ok: false as const, message: "Enrollment not found." };
  }
  if (existing.status === "CANCELLED") {
    return { ok: false as const, message: "This enrollment was cancelled." };
  }

  const { ensureEnrollmentBookingToken, bookTrainingSlots } = await import(
    "@/lib/courses/slots"
  );

  if (existing.status !== "CONFIRMED") {
    await prisma.courseEnrollment.update({
      where: { id: params.enrollmentId },
      data: {
        status: "CONFIRMED" satisfies CourseEnrollmentStatus,
        confirmedAt: new Date(),
        confirmedById: params.confirmedById,
        ...(params.meetUrl != null
          ? { meetUrl: params.meetUrl.trim() || null }
          : {}),
      },
    });
  }

  const token = await ensureEnrollmentBookingToken(existing.id);
  const base = getLoginBaseUrl();
  const bookUrl = `${base}/courses/book-slots?token=${token}`;

  if (params.programStartYmd && existing.slots.length === 0) {
    const booked = await bookTrainingSlots({
      enrollmentId: existing.id,
      programStartYmd: params.programStartYmd,
      meetUrl: params.meetUrl,
      notify: true,
    });
    if (!booked.ok) {
      return {
        ok: true as const,
        message: `Payment confirmed for ${existing.name}. Slot booking: ${booked.message} Book at ${bookUrl}`,
      };
    }
    return {
      ok: true as const,
      message: `Confirmed — ${booked.message}`,
    };
  }

  if (existing.slots.length > 0) {
    return {
      ok: true as const,
      message: `Already confirmed with slots booked for ${courseCohortLabel(existing.cohort)}.`,
    };
  }

  return {
    ok: true as const,
    message: `Confirmed — ${existing.name} (${courseCohortLabel(existing.cohort)}). Book slots: ${bookUrl}`,
  };
}
