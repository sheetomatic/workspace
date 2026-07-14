import { formatInr } from "@/lib/leads/categories";

export type CourseCohortId = "MON_FRI" | "TUE_SAT";

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
  sessionTimeLabel: "8:30 AM – 10:00 AM IST",
  sessionDurationLabel: "1.5 hours",
  totalClasses: 24,
  totalHours: 36,
} as const;

export const courseCohorts = [
  {
    id: "MON_FRI" as const,
    label: "Monday + Friday",
    shortLabel: "Mon + Fri",
    daysLabel: "Monday and Friday each week",
  },
  {
    id: "TUE_SAT" as const,
    label: "Tuesday + Saturday",
    shortLabel: "Tue + Sat",
    daysLabel: "Tuesday and Saturday each week",
  },
] as const;

export function courseCohortLabel(cohort: CourseCohortId) {
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
  amountInr?: number;
  enrollmentId?: string;
}) {
  const amount = courseEnrollmentPriceLabel(params.amountInr);
  const cohort = courseCohortLabel(params.cohort);
  const lines = [
    "Hi Sheetomatic — I paid for the Google Sheets | AppSheet | Looker Studio 1:1 coaching program.",
    "",
    `Name: ${params.name}`,
    `Phone: ${params.phone}`,
    `Email: ${params.email}`,
    `Amount: ${amount}`,
    `Cohort: ${cohort} · ${courseEnrollmentSchedule.sessionTimeLabel}`,
    `Program: ${courseEnrollmentSchedule.totalClasses} live classes × ${courseEnrollmentSchedule.sessionDurationLabel}`,
    "Use cases: based on my business needs (Sheets, AppSheet, Looker).",
  ];
  if (params.enrollmentId) {
    lines.push(`Enrollment ID: ${params.enrollmentId}`);
  }
  lines.push("", "Sharing payment screenshot next — please confirm and book my slots.");
  return lines.join("\n");
}
