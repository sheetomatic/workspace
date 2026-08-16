import { prisma, withDbRetry } from "@/lib/db";
import { ensureTrainingCatalog } from "@/lib/learn/catalog";
import { SHEETS_TEACHING } from "@/lib/learn/sheets-teaching";

export async function applySheetsTeachingContent(params?: {
  embedUrl?: string | null;
  force?: boolean;
}) {
  await ensureTrainingCatalog();
  const course = await prisma.trainingCourse.findUnique({
    where: { track: "SHEETS" },
    select: { id: true },
  });
  if (!course) {
    return { ok: false as const, updated: 0, message: "Sheets course missing." };
  }

  let updated = 0;
  for (const pack of SHEETS_TEACHING) {
    const lesson = await prisma.trainingLesson.findFirst({
      where: { courseId: course.id, sortOrder: pack.no },
      select: { id: true, goal: true },
    });
    if (!lesson) continue;
    if (!params?.force && lesson.goal.trim()) continue;

    await withDbRetry(() =>
      prisma.trainingLesson.update({
        where: { id: lesson.id },
        data: {
          goal: pack.goal,
          practicePrompt: pack.practicePrompt,
          bodyMd: pack.bodyMd,
          embedUrl: params?.embedUrl ?? undefined,
          published: true,
        },
      }),
    );
    updated += 1;
  }

  return {
    ok: true as const,
    updated,
    message: `Marked ${updated} Sheets topics complete on Teach.`,
  };
}
