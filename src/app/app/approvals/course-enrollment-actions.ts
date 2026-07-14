"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { confirmCourseEnrollment } from "@/lib/courses/enrollment";
import { bookTrainingSlots } from "@/lib/courses/slots";

export type CourseEnrollmentActionState = {
  ok: boolean;
  message: string;
};

export async function confirmCourseEnrollmentAction(
  _prev: CourseEnrollmentActionState,
  formData: FormData,
): Promise<CourseEnrollmentActionState> {
  const user = await getSessionUser();
  if (!user?.isSuperAdmin) {
    return { ok: false, message: "Only super admins can confirm course enrollments." };
  }

  const enrollmentId = formData.get("enrollmentId")?.toString().trim();
  const programStartYmd = formData.get("programStartYmd")?.toString().trim();
  const meetUrl = formData.get("meetUrl")?.toString().trim() || null;
  const frequency = formData.get("frequency")?.toString().trim() || "WEEKLY";
  const sessionTimeIst = formData.get("sessionTimeIst")?.toString().trim() || "09:00";
  const totalSessions = Number.parseInt(
    formData.get("totalSessions")?.toString().trim() || "24",
    10,
  );
  const { normalizeTwoWeekdays } = await import("@/lib/courses/weekdays");
  const pair = normalizeTwoWeekdays(
    formData.get("dayOne"),
    formData.get("dayTwo"),
  );
  if (!enrollmentId) {
    return { ok: false, message: "Enrollment not found." };
  }

  const result = await confirmCourseEnrollment({
    enrollmentId,
    confirmedById: user.id,
    programStartYmd: programStartYmd || undefined,
    meetUrl,
    frequency,
    sessionTimeIst,
    totalSessions,
    weekdays: pair.ok ? pair.days : undefined,
  });

  revalidatePath("/app/approvals");
  revalidatePath("/app/my-space/training");
  revalidatePath("/app/leads");
  return { ok: result.ok, message: result.message };
}

export async function bookCourseSlotsAction(
  _prev: CourseEnrollmentActionState,
  formData: FormData,
): Promise<CourseEnrollmentActionState> {
  const user = await getSessionUser();
  if (!user?.isSuperAdmin) {
    return { ok: false, message: "Only super admins can book course slots." };
  }

  const enrollmentId = formData.get("enrollmentId")?.toString().trim();
  const programStartYmd = formData.get("programStartYmd")?.toString().trim();
  const meetUrl = formData.get("meetUrl")?.toString().trim() || null;
  const frequency = formData.get("frequency")?.toString().trim() || "WEEKLY";
  const sessionTimeIst = formData.get("sessionTimeIst")?.toString().trim() || "09:00";
  const totalSessions = Number.parseInt(
    formData.get("totalSessions")?.toString().trim() || "24",
    10,
  );
  const { normalizeTwoWeekdays } = await import("@/lib/courses/weekdays");
  const pair = normalizeTwoWeekdays(
    formData.get("dayOne"),
    formData.get("dayTwo"),
  );
  if (!enrollmentId || !programStartYmd) {
    return { ok: false, message: "Enrollment and start date are required." };
  }
  if (!pair.ok) {
    return { ok: false, message: pair.message };
  }

  const result = await bookTrainingSlots({
    enrollmentId,
    programStartYmd,
    meetUrl,
    frequency,
    sessionTimeIst,
    totalSessions,
    weekdays: pair.days,
    notify: true,
  });

  revalidatePath("/app/approvals");
  revalidatePath("/app/my-space/training");
  revalidatePath("/app/leads");
  return { ok: result.ok, message: result.message };
}
