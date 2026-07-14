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
  if (!enrollmentId) {
    return { ok: false, message: "Enrollment not found." };
  }

  const result = await confirmCourseEnrollment({
    enrollmentId,
    confirmedById: user.id,
    programStartYmd: programStartYmd || undefined,
    meetUrl,
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
  if (!enrollmentId || !programStartYmd) {
    return { ok: false, message: "Enrollment and start date are required." };
  }

  const result = await bookTrainingSlots({
    enrollmentId,
    programStartYmd,
    meetUrl,
    notify: true,
  });

  revalidatePath("/app/approvals");
  revalidatePath("/app/my-space/training");
  revalidatePath("/app/leads");
  return { ok: result.ok, message: result.message };
}
