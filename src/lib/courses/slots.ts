import { randomBytes } from "node:crypto";
import type {
  CourseCohort,
  TrainingCourseSlot,
  TrainingFrequency,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  COURSE_ENROLLMENT_PRICE_INR,
  courseCohortLabel,
  courseEnrollmentSchedule,
  type CourseCohortId,
} from "@/lib/content/courses-enrollment";
import {
  buildGoogleCalendarEventUrl,
  toIcsUtcStamp,
} from "@/lib/leads/calendar-links";

const DEFAULT_SESSION_DURATION_MIN = 90;
const DEFAULT_SESSION_TIME_IST = "08:30";
const DEFAULT_TOTAL_SESSIONS = courseEnrollmentSchedule.totalClasses;
const DEFAULT_FREQUENCY: TrainingFrequency = "WEEKLY";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function newBookingToken() {
  return randomBytes(24).toString("hex");
}

export function cohortWeekdays(cohort: CourseCohort | CourseCohortId): number[] {
  return cohort === "MON_FRI" ? [1, 5] : [2, 6];
}

/** Calendar Y-M-D in Asia/Kolkata. */
export function toIstYmd(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function parseYmd(ymd: string): { y: number; m: number; d: number } {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) {
    throw new Error("Invalid date.");
  }
  return { y, m, d };
}

function weekdayFromYmd(ymd: string): number {
  const { y, m, d } = parseYmd(ymd);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
}

function addDaysYmd(ymd: string, days: number): string {
  const { y, m, d } = parseYmd(ymd);
  const next = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

/** Normalize HH:mm (24h) IST time; falls back to 08:30. */
export function normalizeSessionTimeIst(raw: string | null | undefined): string {
  const match = String(raw ?? "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return DEFAULT_SESSION_TIME_IST;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return DEFAULT_SESSION_TIME_IST;
  }
  return `${pad(hour)}:${pad(minute)}`;
}

export function normalizeTotalSessions(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n)) return DEFAULT_TOTAL_SESSIONS;
  return Math.min(48, Math.max(1, Math.round(n)));
}

export function normalizeSessionDurationMin(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n)) return DEFAULT_SESSION_DURATION_MIN;
  return Math.min(240, Math.max(30, Math.round(n)));
}

export function normalizeFrequency(
  raw: string | null | undefined,
): TrainingFrequency {
  return raw === "BIWEEKLY" ? "BIWEEKLY" : DEFAULT_FREQUENCY;
}

/**
 * Session start Date for an IST calendar day at the given HH:mm IST.
 * IST is UTC+5:30.
 */
export function sessionStartUtcFromYmd(
  ymd: string,
  timeIst: string = DEFAULT_SESSION_TIME_IST,
): Date {
  const { y, m, d } = parseYmd(ymd);
  const normalized = normalizeSessionTimeIst(timeIst);
  const [hh, mm] = normalized.split(":").map(Number);
  const totalMinutesIst = hh * 60 + mm;
  let totalMinutesUtc = totalMinutesIst - (5 * 60 + 30);
  let dayOffset = 0;
  if (totalMinutesUtc < 0) {
    dayOffset = -1;
    totalMinutesUtc += 24 * 60;
  } else if (totalMinutesUtc >= 24 * 60) {
    dayOffset = 1;
    totalMinutesUtc -= 24 * 60;
  }
  const utcH = Math.floor(totalMinutesUtc / 60);
  const utcM = totalMinutesUtc % 60;
  return new Date(Date.UTC(y, m - 1, d + dayOffset, utcH, utcM, 0));
}

export function sessionEndUtc(
  startsAt: Date,
  durationMin: number = DEFAULT_SESSION_DURATION_MIN,
): Date {
  return new Date(startsAt.getTime() + durationMin * 60_000);
}

export function formatSessionTimeLabel(
  timeIst: string,
  durationMin: number,
): string {
  const start = normalizeSessionTimeIst(timeIst);
  const [hh, mm] = start.split(":").map(Number);
  const endTotal = hh * 60 + mm + durationMin;
  const endH = Math.floor(endTotal / 60) % 24;
  const endM = endTotal % 60;
  const fmt = (h: number, m: number) => {
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${pad(m)} ${ampm}`;
  };
  return `${fmt(hh, mm)} – ${fmt(endH, endM)} IST`;
}

export type GeneratedSession = {
  sessionNumber: number;
  startsAt: Date;
  endsAt: Date;
  title: string;
  ymd: string;
};

export function generateTrainingSessions(params: {
  cohort: CourseCohort | CourseCohortId;
  programStartYmd: string;
  totalSessions?: number;
  sessionTimeIst?: string;
  sessionDurationMin?: number;
  frequency?: TrainingFrequency;
  studentName?: string;
}): GeneratedSession[] {
  const total = normalizeTotalSessions(
    params.totalSessions ?? DEFAULT_TOTAL_SESSIONS,
  );
  const timeIst = normalizeSessionTimeIst(params.sessionTimeIst);
  const durationMin = normalizeSessionDurationMin(
    params.sessionDurationMin ?? DEFAULT_SESSION_DURATION_MIN,
  );
  const frequency = normalizeFrequency(params.frequency);
  const weekdays = new Set(cohortWeekdays(params.cohort));
  let cursor = params.programStartYmd;
  // Walk forward until we land on a cohort weekday.
  for (let i = 0; i < 14; i += 1) {
    if (weekdays.has(weekdayFromYmd(cursor))) break;
    cursor = addDaysYmd(cursor, 1);
  }
  if (!weekdays.has(weekdayFromYmd(cursor))) {
    throw new Error("Could not find a valid cohort start day.");
  }

  const sessions: GeneratedSession[] = [];
  let daysSinceStart = 0;
  let guard = 0;
  while (sessions.length < total && guard < 800) {
    guard += 1;
    if (weekdays.has(weekdayFromYmd(cursor))) {
      const weekIndex = Math.floor(daysSinceStart / 7);
      const include = frequency === "WEEKLY" || weekIndex % 2 === 0;
      if (include) {
        const startsAt = sessionStartUtcFromYmd(cursor, timeIst);
        const n = sessions.length + 1;
        sessions.push({
          sessionNumber: n,
          startsAt,
          endsAt: sessionEndUtc(startsAt, durationMin),
          title: `Sheets/AppSheet/Looker 1:1 — Session ${n}${
            params.studentName ? ` · ${params.studentName}` : ""
          }`,
          ymd: cursor,
        });
      }
    }
    cursor = addDaysYmd(cursor, 1);
    daysSinceStart += 1;
  }
  return sessions;
}

export function buildTrainingGoogleCalendarUrl(slot: {
  title: string;
  startsAt: Date;
  endsAt: Date;
  meetUrl?: string | null;
  studentName?: string | null;
  details?: string;
}) {
  return buildGoogleCalendarEventUrl({
    title: slot.title,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    details: [
      slot.studentName ? `Student: ${slot.studentName}` : null,
      slot.details,
      slot.meetUrl ? `Join: ${slot.meetUrl}` : null,
      "Sheetomatic 1:1 coaching",
    ]
      .filter(Boolean)
      .join("\n"),
    location: slot.meetUrl ?? undefined,
  });
}

export function buildTrainingIcsContent(params: {
  slots: Array<Pick<TrainingCourseSlot, "sessionNumber" | "startsAt" | "endsAt" | "title" | "meetUrl">>;
  studentName: string;
}) {
  const escape = (s: string) =>
    s
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");

  const events = params.slots.map((slot) => {
    const desc = [
      `Student: ${params.studentName}`,
      slot.meetUrl ? `Meet: ${slot.meetUrl}` : null,
      "Sheetomatic 1:1 coaching",
    ]
      .filter(Boolean)
      .join("\\n");
    return [
      "BEGIN:VEVENT",
      `UID:training-${slot.sessionNumber}-${toIcsUtcStamp(slot.startsAt)}@sheetomatic.com`,
      `DTSTAMP:${toIcsUtcStamp(new Date())}`,
      `DTSTART:${toIcsUtcStamp(slot.startsAt)}`,
      `DTEND:${toIcsUtcStamp(slot.endsAt)}`,
      `SUMMARY:${escape(slot.title)}`,
      `DESCRIPTION:${escape(desc)}`,
      "END:VEVENT",
    ].join("\r\n");
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sheetomatic//Training//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export async function ensureEnrollmentBookingToken(enrollmentId: string) {
  const existing = await prisma.courseEnrollment.findUnique({
    where: { id: enrollmentId },
    select: { bookingToken: true },
  });
  if (existing?.bookingToken) {
    return existing.bookingToken;
  }
  const token = newBookingToken();
  await prisma.courseEnrollment.update({
    where: { id: enrollmentId },
    data: { bookingToken: token },
  });
  return token;
}

export async function bookTrainingSlots(params: {
  enrollmentId: string;
  programStartYmd: string;
  meetUrl?: string | null;
  frequency?: TrainingFrequency | string | null;
  sessionTimeIst?: string | null;
  sessionDurationMin?: number | null;
  totalSessions?: number | null;
  organizationId?: string | null;
  inboundLeadId?: string | null;
  notify?: boolean;
}) {
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { id: params.enrollmentId },
    include: { slots: { select: { id: true }, take: 1 } },
  });
  if (!enrollment) {
    return { ok: false as const, message: "Enrollment not found." };
  }
  if (enrollment.status === "CANCELLED") {
    return { ok: false as const, message: "Enrollment is cancelled." };
  }
  if (enrollment.slots.length > 0) {
    return {
      ok: false as const,
      message: "Slots already booked for this enrollment. Cancel existing slots before rebooking.",
    };
  }

  let ymd = params.programStartYmd.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return { ok: false as const, message: "Choose a valid program start date." };
  }

  const frequency = normalizeFrequency(
    params.frequency ?? enrollment.frequency,
  );
  const sessionTimeIst = normalizeSessionTimeIst(
    params.sessionTimeIst ?? enrollment.sessionTimeIst,
  );
  const sessionDurationMin = normalizeSessionDurationMin(
    params.sessionDurationMin ?? enrollment.sessionDurationMin,
  );
  const totalSessions = normalizeTotalSessions(
    params.totalSessions ?? enrollment.totalSessions,
  );

  const sessions = generateTrainingSessions({
    cohort: enrollment.cohort,
    programStartYmd: ymd,
    studentName: enrollment.name,
    frequency,
    sessionTimeIst,
    sessionDurationMin,
    totalSessions,
  });
  const meetUrl = params.meetUrl?.trim().slice(0, 500) || enrollment.meetUrl || null;
  const organizationId =
    params.organizationId ?? enrollment.organizationId ?? null;
  const inboundLeadId =
    params.inboundLeadId ?? enrollment.inboundLeadId ?? null;
  const bookingToken = enrollment.bookingToken || newBookingToken();

  const firstStart = sessions[0]!.startsAt;
  const timeLabel = formatSessionTimeLabel(sessionTimeIst, sessionDurationMin);

  await prisma.$transaction([
    prisma.courseEnrollment.update({
      where: { id: enrollment.id },
      data: {
        programStartDate: firstStart,
        meetUrl,
        bookingToken,
        organizationId,
        inboundLeadId,
        frequency,
        sessionTimeIst,
        sessionDurationMin,
        totalSessions,
      },
    }),
    prisma.trainingCourseSlot.createMany({
      data: sessions.map((session) => ({
        enrollmentId: enrollment.id,
        organizationId,
        inboundLeadId,
        sessionNumber: session.sessionNumber,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        title: session.title,
        meetUrl,
        status: "SCHEDULED" as const,
      })),
    }),
  ]);

  const slots = await prisma.trainingCourseSlot.findMany({
    where: { enrollmentId: enrollment.id, status: "SCHEDULED" },
    orderBy: { sessionNumber: "asc" },
  });

  if (params.notify !== false) {
    void import("@/lib/courses/slot-notifications")
      .then((mod) => mod.notifyTrainingSlotsBooked(enrollment.id))
      .catch(() => {
        // Non-blocking alerts.
      });
  }

  return {
    ok: true as const,
    message: `Booked ${slots.length} sessions starting ${toIstYmd(firstStart)} (${courseCohortLabel(enrollment.cohort)}, ${frequency.toLowerCase()}, ${timeLabel}).`,
    slots,
    bookingToken,
  };
}

export async function listUpcomingTrainingSlots(params: {
  organizationId?: string | null;
  /** When true and no org filter, return platform-wide (super admin My Space). */
  platformWide?: boolean;
  take?: number;
}) {
  const take = params.take ?? 40;
  return prisma.trainingCourseSlot.findMany({
    where: {
      status: "SCHEDULED",
      startsAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) },
      ...(params.organizationId
        ? { organizationId: params.organizationId }
        : params.platformWide
          ? {}
          : { organizationId: "__none__" }),
    },
    include: {
      enrollment: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          cohort: true,
          status: true,
          inboundLeadId: true,
        },
      },
    },
    orderBy: { startsAt: "asc" },
    take,
  });
}

export async function getEnrollmentSlotsByToken(token: string) {
  const enrollment = await prisma.courseEnrollment.findFirst({
    where: { bookingToken: token },
    include: {
      slots: { orderBy: { sessionNumber: "asc" } },
    },
  });
  return enrollment;
}

export async function listLeadTrainingEnrollments(params: {
  organizationId: string;
  leadId: string;
  email?: string | null;
  phone?: string | null;
}) {
  const phoneDigits = params.phone?.replace(/\D/g, "") ?? "";
  const email = params.email?.trim().toLowerCase() || null;

  return prisma.courseEnrollment.findMany({
    where: {
      OR: [
        { inboundLeadId: params.leadId, organizationId: params.organizationId },
        ...(email ? [{ email }] : []),
        ...(phoneDigits.length >= 10
          ? [{ phone: { contains: phoneDigits.slice(-10) } }]
          : []),
      ],
    },
    include: {
      slots: {
        where: { status: { not: "CANCELLED" } },
        orderBy: { sessionNumber: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
}

export async function bookTrainingSlotsForLead(params: {
  organizationId: string;
  leadId: string;
  cohort: CourseCohortId;
  programStartYmd: string;
  meetUrl?: string | null;
  frequency?: TrainingFrequency | string | null;
  sessionTimeIst?: string | null;
  sessionDurationMin?: number | null;
  totalSessions?: number | null;
  name: string;
  phone: string;
  email: string;
  markConfirmed?: boolean;
  confirmedById?: string;
}) {
  const frequency = normalizeFrequency(params.frequency);
  const sessionTimeIst = normalizeSessionTimeIst(params.sessionTimeIst);
  const sessionDurationMin = normalizeSessionDurationMin(
    params.sessionDurationMin,
  );
  const totalSessions = normalizeTotalSessions(params.totalSessions);

  const existing = await prisma.courseEnrollment.findFirst({
    where: {
      OR: [
        { inboundLeadId: params.leadId, organizationId: params.organizationId },
        {
          email: params.email.trim().toLowerCase(),
          status: { in: ["PAYMENT_PENDING", "CONFIRMED"] },
        },
      ],
    },
    include: { slots: { select: { id: true }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  let enrollmentId = existing?.id;
  if (!enrollmentId) {
    const created = await prisma.courseEnrollment.create({
      data: {
        name: params.name.trim().slice(0, 120),
        phone: params.phone.replace(/[^\d+]/g, "").slice(0, 32),
        email: params.email.trim().toLowerCase().slice(0, 200),
        cohort: params.cohort,
        amountInr: COURSE_ENROLLMENT_PRICE_INR,
        status: params.markConfirmed ? "CONFIRMED" : "PAYMENT_PENDING",
        confirmedAt: params.markConfirmed ? new Date() : null,
        confirmedById: params.markConfirmed ? params.confirmedById ?? null : null,
        organizationId: params.organizationId,
        inboundLeadId: params.leadId,
        bookingToken: newBookingToken(),
        meetUrl: params.meetUrl?.trim() || null,
        frequency,
        sessionTimeIst,
        sessionDurationMin,
        totalSessions,
      },
    });
    enrollmentId = created.id;
  } else {
    await prisma.courseEnrollment.update({
      where: { id: enrollmentId },
      data: {
        organizationId: params.organizationId,
        inboundLeadId: params.leadId,
        cohort: params.cohort,
        meetUrl: params.meetUrl?.trim() || undefined,
        frequency,
        sessionTimeIst,
        sessionDurationMin,
        totalSessions,
        ...(params.markConfirmed && existing?.status !== "CONFIRMED"
          ? {
              status: "CONFIRMED" as const,
              confirmedAt: new Date(),
              confirmedById: params.confirmedById ?? null,
            }
          : {}),
        bookingToken: existing?.bookingToken || newBookingToken(),
      },
    });
    if (existing?.slots.length) {
      // Replace cancelled-only; if active slots exist, fail.
      return {
        ok: false as const,
        message: "This student already has booked slots. View them below.",
        enrollmentId,
      };
    }
  }

  return bookTrainingSlots({
    enrollmentId: enrollmentId!,
    programStartYmd: params.programStartYmd,
    meetUrl: params.meetUrl,
    frequency,
    sessionTimeIst,
    sessionDurationMin,
    totalSessions,
    organizationId: params.organizationId,
    inboundLeadId: params.leadId,
    notify: true,
  });
}

export function formatSlotWhen(startsAt: Date) {
  return startsAt.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
