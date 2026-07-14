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

import {
  cohortFromWeekdays,
  formatWeekdaysCsv,
  isWithinTrainingBookingWindow,
  TRAINING_BOOKING_WINDOW,
  weekdaysFromCohort,
  weekdaysLabel,
} from "@/lib/courses/weekdays";

const DEFAULT_SESSION_DURATION_MIN = 90;
const DEFAULT_SESSION_TIME_IST = TRAINING_BOOKING_WINDOW.startIst;
const DEFAULT_TOTAL_SESSIONS = courseEnrollmentSchedule.totalClasses;
const DEFAULT_FREQUENCY: TrainingFrequency = "WEEKLY";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function newBookingToken() {
  return randomBytes(24).toString("hex");
}

export function cohortWeekdays(
  cohort: CourseCohort | CourseCohortId,
  weekdaysCsv?: string | null,
): number[] {
  return weekdaysFromCohort(cohort, weekdaysCsv);
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

/** Normalize HH:mm (24h) IST time; falls back to 09:00. */
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

/** Normalize time and keep it inside the 9 AM–5 PM IST bookable window. */
export function normalizeBookableSessionTimeIst(
  raw: string | null | undefined,
): string {
  const normalized = normalizeSessionTimeIst(raw);
  if (isWithinTrainingBookingWindow(normalized)) return normalized;
  return DEFAULT_SESSION_TIME_IST;
}

export function normalizeTotalSessions(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n)) return DEFAULT_TOTAL_SESSIONS;
  return Math.min(48, Math.max(1, Math.round(n)));
}

export function normalizeSessionDurationMin(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n)) return DEFAULT_SESSION_DURATION_MIN;
  // Allow up to 6h so 3-hour single-day sessions are first-class.
  return Math.min(360, Math.max(30, Math.round(n)));
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
  weekdays?: number[] | null;
  weekdaysCsv?: string | null;
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
  const timeIst = normalizeBookableSessionTimeIst(params.sessionTimeIst);
  const durationMin = normalizeSessionDurationMin(
    params.sessionDurationMin ?? DEFAULT_SESSION_DURATION_MIN,
  );
  const frequency = normalizeFrequency(params.frequency);
  const resolvedWeekdays =
    params.weekdays && params.weekdays.length > 0
      ? [...new Set(params.weekdays)].sort((a, b) => a - b)
      : cohortWeekdays(params.cohort, params.weekdaysCsv);
  if (resolvedWeekdays.length === 0) {
    throw new Error("Choose at least one weekday for the schedule.");
  }
  const weekdays = new Set(resolvedWeekdays);
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
  weekdays?: number[] | null;
  weekdaysCsv?: string | null;
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
  const rawTime = params.sessionTimeIst ?? enrollment.sessionTimeIst;
  if (rawTime && !isWithinTrainingBookingWindow(normalizeSessionTimeIst(rawTime))) {
    return {
      ok: false as const,
      message: `Choose a start time between ${TRAINING_BOOKING_WINDOW.label}.`,
    };
  }
  const sessionTimeIst = normalizeBookableSessionTimeIst(rawTime);
  const sessionDurationMin = normalizeSessionDurationMin(
    params.sessionDurationMin ?? enrollment.sessionDurationMin,
  );
  const totalSessions = normalizeTotalSessions(
    params.totalSessions ?? enrollment.totalSessions,
  );
  const weekdays =
    params.weekdays && params.weekdays.length > 0
      ? [...new Set(params.weekdays)].sort((a, b) => a - b)
      : cohortWeekdays(
          enrollment.cohort,
          params.weekdaysCsv ?? enrollment.weekdaysCsv,
        );
  if (weekdays.length < 1) {
    return { ok: false as const, message: "Choose the training days." };
  }
  const weekdaysCsv = formatWeekdaysCsv(weekdays);

  const sessions = generateTrainingSessions({
    cohort: enrollment.cohort,
    weekdays,
    weekdaysCsv,
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
        weekdaysCsv,
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
    message: `Booked ${slots.length} sessions starting ${toIstYmd(firstStart)} (${weekdaysLabel(weekdays)}, ${frequency.toLowerCase()}, ${timeLabel}).`,
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

/** Active students with booked schedules — student-first My Space training view. */
export async function listActiveTrainingStudents(params: {
  organizationId?: string | null;
  platformWide?: boolean;
  take?: number;
}) {
  const take = params.take ?? 80;
  const orgFilter = params.organizationId
    ? { organizationId: params.organizationId }
    : params.platformWide
      ? {}
      : { organizationId: "__none__" };

  const enrollments = await prisma.courseEnrollment.findMany({
    where: {
      status: { in: ["CONFIRMED", "PAYMENT_PENDING"] },
      slots: {
        some: {
          status: "SCHEDULED",
          ...orgFilter,
        },
      },
      ...orgFilter,
    },
    include: {
      slots: {
        where: { status: { not: "CANCELLED" } },
        orderBy: { sessionNumber: "asc" },
      },
    },
    orderBy: [{ name: "asc" }, { createdAt: "desc" }],
    take,
  });

  const now = Date.now();
  return enrollments.map((enrollment) => {
    const upcoming = enrollment.slots.filter(
      (slot) =>
        slot.status === "SCHEDULED" &&
        slot.startsAt.getTime() >= now - 2 * 60 * 60 * 1000,
    );
    const nextSlot = upcoming[0] ?? null;
    const joinUrl =
      enrollment.meetUrl?.trim() ||
      nextSlot?.meetUrl?.trim() ||
      enrollment.slots.find((slot) => slot.meetUrl?.trim())?.meetUrl?.trim() ||
      null;

    return {
      id: enrollment.id,
      name: enrollment.name,
      phone: enrollment.phone,
      email: enrollment.email,
      status: enrollment.status,
      cohort: enrollment.cohort,
      weekdaysCsv: enrollment.weekdaysCsv,
      daysLabel: courseCohortLabel(enrollment.cohort, enrollment.weekdaysCsv),
      frequency: enrollment.frequency,
      sessionTimeIst: enrollment.sessionTimeIst,
      sessionDurationMin: enrollment.sessionDurationMin,
      totalSessions: enrollment.totalSessions,
      programStartDate: enrollment.programStartDate,
      meetUrl: enrollment.meetUrl,
      joinUrl,
      inboundLeadId: enrollment.inboundLeadId,
      bookingToken: enrollment.bookingToken,
      upcomingCount: upcoming.length,
      completedCount: enrollment.slots.filter((slot) => slot.status === "COMPLETED")
        .length,
      totalBooked: enrollment.slots.length,
      nextWhenLabel: nextSlot ? formatSlotWhen(nextSlot.startsAt) : null,
      slots: enrollment.slots.map((slot) => ({
        id: slot.id,
        sessionNumber: slot.sessionNumber,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        title: slot.title,
        status: slot.status,
        meetUrl: slot.meetUrl,
        whenLabel: formatSlotWhen(slot.startsAt),
        joinUrl: slot.meetUrl?.trim() || enrollment.meetUrl?.trim() || null,
      })),
    };
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
  /** Optional legacy preset; ignored when weekdays are provided. */
  cohort?: CourseCohortId;
  weekdays: number[];
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
  const weekdays = [...new Set(params.weekdays)]
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
    .sort((a, b) => a - b);
  if (weekdays.length < 1) {
    return {
      ok: false as const,
      message: "Pick at least one weekday (single day or a two-day combo).",
    };
  }
  const weekdaysCsv = formatWeekdaysCsv(weekdays);
  const cohort = cohortFromWeekdays(weekdays);
  const frequency = normalizeFrequency(params.frequency);
  if (
    params.sessionTimeIst &&
    !isWithinTrainingBookingWindow(normalizeSessionTimeIst(params.sessionTimeIst))
  ) {
    return {
      ok: false as const,
      message: `Choose a start time between ${TRAINING_BOOKING_WINDOW.label}.`,
    };
  }
  const sessionTimeIst = normalizeBookableSessionTimeIst(params.sessionTimeIst);
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
        cohort,
        weekdaysCsv,
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
        cohort,
        weekdaysCsv,
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
    weekdays,
    weekdaysCsv,
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
