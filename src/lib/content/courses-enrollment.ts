import { formatInr } from "@/lib/leads/categories";
import {
  getCourseProgram,
  type CourseProgramId,
} from "@/lib/content/course-programs";
import {
  TRAINING_BOOKING_WINDOW,
  weekdaysLabel,
  weekdaysFromCohort,
} from "@/lib/courses/weekdays";

export type CourseCohortId = "MON_FRI" | "TUE_SAT" | "CUSTOM";

export const COURSE_ENROLLMENT_PRICE_INR = 35_000;

/** Public short link for Sheetomatic training appointment booking. */
export const COURSE_GOOGLE_CALENDAR_BOOKING_URL =
  "https://calendar.app.google/kbDEB6xuqRYEdUue9";

/**
 * Inline embed URL (Google Appointment Schedule `?gv=true`).
 * Resolved from calendar.app.google/kbDEB6xuqRYEdUue9.
 */
export const COURSE_GOOGLE_CALENDAR_EMBED_URL =
  "https://calendar.google.com/calendar/appointments/schedules/AcZssZ1HRaqFe2jOG8jWUtnn-3SQqWG9HB6wcU5008k4lk70hW1qS5mFdJO-qGfAw7VaFKgldKHV3q88?gv=true";

export const courseEnrollmentSchedule = {
  sessionsPerWeek: 2,
  sessionTimeLabel: TRAINING_BOOKING_WINDOW.label,
  sessionDurationLabel: "1.5 hours",
  totalClasses: 24,
  totalHours: 36,
  /** Any start time inside this IST window can be booked (incl. Sunday). */
  bookingWindowLabel: TRAINING_BOOKING_WINDOW.label,
} as const;

/** Marketing presets — CRM can also pick any two weekdays (incl. Sunday). */
export const courseCohorts = [
  {
    id: "MON_FRI" as const,
    label: "Monday + Friday",
    shortLabel: "Mon + Fri",
    daysLabel: "Monday and Friday each week",
    weekdays: [1, 5] as const,
  },
  {
    id: "TUE_SAT" as const,
    label: "Tuesday + Saturday",
    shortLabel: "Tue + Sat",
    daysLabel: "Tuesday and Saturday each week",
    weekdays: [2, 6] as const,
  },
] as const;

export function courseCohortLabel(
  cohort: CourseCohortId,
  weekdaysCsv?: string | null,
) {
  if (cohort === "CUSTOM" || weekdaysCsv) {
    const days = weekdaysFromCohort(cohort, weekdaysCsv);
    if (days.length > 0) return weekdaysLabel(days);
  }
  return courseCohorts.find((item) => item.id === cohort)?.label ?? cohort;
}

export function courseEnrollmentPriceLabel(amountInr = COURSE_ENROLLMENT_PRICE_INR) {
  return formatInr(amountInr);
}

export function buildCoursePaymentNote(cohort: CourseCohortId) {
  const short = courseCohorts.find((item) => item.id === cohort)?.shortLabel ?? cohort;
  return `Sheetomatic Sheets AppSheet Looker 1:1 ${short}`;
}

export function buildCourseEnrollmentWhatsAppMessage(params: {
  name: string;
  phone: string;
  email: string;
  cohort: CourseCohortId;
  programId: CourseProgramId;
  enrollmentId?: string;
}) {
  const program = getCourseProgram(params.programId);
  const cohort = courseCohortLabel(params.cohort);
  const lines = [
    `Hi Sheetomatic — I paid the seat advance for ${program?.name ?? "a course"}.`,
    "",
    `Name: ${params.name}`,
    `Phone: ${params.phone}`,
    `Email: ${params.email}`,
  ];
  if (program) {
    lines.push(
      `Program: ${program.name}`,
      `Fee: ${courseEnrollmentPriceLabel(program.priceInr)} · GST extra`,
      `Paid now: ${courseEnrollmentPriceLabel(program.advanceInr)} (50% to confirm the seat)`,
      `Balance before class 1: ${courseEnrollmentPriceLabel(program.priceInr - program.advanceInr)}`,
      `Cohort: ${cohort} · ${program.sessionTimeLabel}`,
      `Classes: ${program.totalClasses} × ${program.sessionDurationLabel}`,
    );
  } else {
    lines.push(`Cohort: ${cohort}`);
  }
  if (params.enrollmentId) {
    lines.push(`Enrollment ID: ${params.enrollmentId}`);
  }
  lines.push("", "Sharing the Razorpay receipt next — please confirm and book my slots.");
  return lines.join("\n");
}
