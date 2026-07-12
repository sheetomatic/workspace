"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { confirmCourseEnrollment } from "@/lib/courses/enrollment";

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
  if (!enrollmentId) {
    return { ok: false, message: "Enrollment not found." };
  }

  const result = await confirmCourseEnrollment({
    enrollmentId,
    confirmedById: user.id,
  });

  revalidatePath("/app/approvals");
  return { ok: result.ok, message: result.message };
}
