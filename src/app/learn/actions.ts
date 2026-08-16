"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  clearLearnSessionCookie,
  findEnrollmentForStudentLogin,
  requireLearnEnrollment,
  setLearnSessionCookie,
} from "@/lib/learn/session";

export async function studentLearnLoginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const phone = String(formData.get("phone") ?? "");
  const token = String(formData.get("token") ?? "");

  const enrollment = await findEnrollmentForStudentLogin({
    email,
    phone,
    token: token || undefined,
  });

  if (!enrollment) {
    return {
      ok: false as const,
      message:
        "No training enrollment matched. Use the email and WhatsApp number from your booking, or open the link we sent you.",
    };
  }

  await setLearnSessionCookie(enrollment.id);
  redirect("/learn");
}

export async function studentLearnLogoutAction() {
  await clearLearnSessionCookie();
  redirect("/learn/login");
}

export async function markLearnLessonDoneAction(formData: FormData) {
  const enrollment = await requireLearnEnrollment();
  if (!enrollment) {
    return { ok: false as const, message: "Please sign in again." };
  }

  const lessonId = String(formData.get("lessonId") ?? "").trim();
  const lesson = await prisma.trainingLesson.findFirst({
    where: { id: lessonId, published: true },
    select: { id: true },
  });
  if (!lesson) {
    return { ok: false as const, message: "Lesson not found." };
  }

  await prisma.trainingLessonProgress.upsert({
    where: {
      enrollmentId_lessonId: {
        enrollmentId: enrollment.id,
        lessonId: lesson.id,
      },
    },
    create: {
      enrollmentId: enrollment.id,
      lessonId: lesson.id,
      completedAt: new Date(),
    },
    update: { completedAt: new Date() },
  });

  return { ok: true as const, message: "Marked as done." };
}
