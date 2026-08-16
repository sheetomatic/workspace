"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  parseTrainingTrack,
  slugifyLessonTitle,
} from "@/lib/learn/catalog";
import { normalizeLessonMediaUrl } from "@/lib/learn/media";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";

function refreshLearnPaths() {
  revalidatePath("/app/leads/training");
  revalidatePath("/app/leads/training/content");
  revalidatePath("/learn");
  revalidatePath("/learn/learn");
  revalidatePath("/learn/courses");
}

async function requireTrainer() {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "STAFF")) {
    return { ok: false as const, message: "Staff access required.", user: null };
  }
  return { ok: true as const, message: "", user };
}

export async function saveTrainingLessonAction(formData: FormData) {
  const auth = await requireTrainer();
  if (!auth.ok || !auth.user) return { ok: false as const, message: auth.message };

  const lessonId = String(formData.get("lessonId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  if (!lessonId || !title) {
    return { ok: false as const, message: "Lesson and title are required." };
  }

  const lesson = await prisma.trainingLesson.findFirst({
    where: { id: lessonId },
    select: { id: true },
  });
  if (!lesson) {
    return { ok: false as const, message: "Lesson not found." };
  }

  await prisma.trainingLesson.update({
    where: { id: lesson.id },
    data: {
      title,
      moduleLabel: String(formData.get("moduleLabel") ?? "").trim(),
      summary: String(formData.get("summary") ?? "").trim(),
      goal: String(formData.get("goal") ?? "").trim(),
      practicePrompt: String(formData.get("practicePrompt") ?? "").trim(),
      bodyMd: String(formData.get("bodyMd") ?? "").trim(),
      videoUrl: normalizeLessonMediaUrl(String(formData.get("videoUrl") ?? "")),
      embedUrl: normalizeLessonMediaUrl(String(formData.get("embedUrl") ?? "")),
      published: String(formData.get("published") ?? "") === "1",
    },
  });

  refreshLearnPaths();
  return { ok: true as const, message: "Lesson saved. Students see this on Learn." };
}

export async function createTrainingLessonAction(formData: FormData) {
  const auth = await requireTrainer();
  if (!auth.ok || !auth.user) return { ok: false as const, message: auth.message };

  const track = parseTrainingTrack(String(formData.get("track") ?? ""));
  const title = String(formData.get("title") ?? "").trim();
  const moduleLabel = String(formData.get("moduleLabel") ?? "").trim() || "Custom";
  if (!track || !title) {
    return { ok: false as const, message: "Pick a track and enter a lesson title." };
  }

  const course = await prisma.trainingCourse.findUnique({
    where: { track },
    select: { id: true, _count: { select: { lessons: true } } },
  });
  if (!course) {
    return { ok: false as const, message: "Course track not found. Open this page once to seed it." };
  }

  let slug = slugifyLessonTitle(title, "lesson");
  const clash = await prisma.trainingLesson.findFirst({
    where: { courseId: course.id, slug },
    select: { id: true },
  });
  if (clash) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }

  const created = await prisma.trainingLesson.create({
    data: {
      courseId: course.id,
      slug,
      title,
      moduleLabel,
      summary: String(formData.get("summary") ?? "").trim(),
      sortOrder: course._count.lessons + 1,
      published: false,
    },
    select: { id: true },
  });

  refreshLearnPaths();
  return {
    ok: true as const,
    message: "Lesson added. Fill your teaching notes, then publish.",
    lessonId: created.id,
  };
}

export async function publishMsmeWorkbookAction() {
  const auth = await requireTrainer();
  if (!auth.ok || !auth.user) return { ok: false as const, message: auth.message };
  try {
    const { publishMsmeWorkbookToGoogle } = await import(
      "@/lib/learn/publish-msme-sheet"
    );
    return await publishMsmeWorkbookToGoogle();
  } catch (error) {
    console.error("[learn] publish action failed", error);
    return {
      ok: false as const,
      message:
        "Publish failed. Use Download Excel, or try Publish again — this page stays open.",
    };
  }
}
