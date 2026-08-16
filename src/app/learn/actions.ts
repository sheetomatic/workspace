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
    redirect("/learn/login?error=nomatch");
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
    redirect("/learn/login");
  }

  const lessonId = String(formData.get("lessonId") ?? "").trim();
  const lesson = await prisma.trainingLesson.findFirst({
    where: { id: lessonId, published: true },
    select: { id: true },
  });
  if (!lesson) {
    redirect("/learn/courses");
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
}
