import { CrmSubmoduleShell } from "@/components/saas/crm-submodule-shell";
import {
  TrainingCurriculumPanel,
  type CurriculumCourseView,
} from "@/components/saas/training-curriculum-panel";
import { TrainingTabs } from "@/components/saas/training-tabs";
import "@/components/saas/leads-machine.css";
import "@/components/saas/training-students-panel.css";
import { listTrainingCurriculum } from "@/lib/learn/catalog";
import { withDbRetry } from "@/lib/db";
import { learnPracticeCopyUrl } from "@/lib/learn/practice-workbook";
import { requireSession } from "@/lib/require-session";

export default async function MySpaceTrainingContentPage({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string }>;
}) {
  await requireSession("MANAGER");
  const params = await searchParams;
  let coursesRaw: Awaited<ReturnType<typeof listTrainingCurriculum>> = [];
  let loadError = false;
  try {
    coursesRaw = await withDbRetry(() => listTrainingCurriculum());
  } catch (error) {
    loadError = true;
    console.error("[my-space-training] curriculum unavailable", error);
  }

  const courses: CurriculumCourseView[] = coursesRaw.map((course) => ({
    id: course.id,
    track: course.track,
    title: course.title,
    summary: course.summary,
    lessons: course.lessons.map((lesson) => ({
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      moduleLabel: lesson.moduleLabel,
      summary: lesson.summary,
      goal: lesson.goal,
      practicePrompt: lesson.practicePrompt,
      bodyMd: lesson.bodyMd,
      videoUrl: lesson.videoUrl,
      embedUrl: lesson.embedUrl,
      published: lesson.published,
      sortOrder: lesson.sortOrder,
    })),
  }));

  const ready = courses.reduce(
    (sum, course) =>
      sum +
      course.lessons.filter(
        (lesson) =>
          lesson.published &&
          (lesson.goal || lesson.bodyMd || lesson.videoUrl || lesson.embedUrl),
      ).length,
    0,
  );
  const total = courses.reduce((sum, course) => sum + course.lessons.length, 0);

  return (
    <CrmSubmoduleShell
      title="Teach"
      description="Write each lesson the way you teach it. Students get the same blocks on Learn."
      leadsHref={null}
      kpis={[
        { label: "Tracks", value: String(courses.length), accent: "blue" },
        { label: "Lessons", value: String(total) },
        { label: "Ready for students", value: String(ready), accent: "success" },
      ]}
    >
      <TrainingTabs current="curriculum" basePath="/app/my-space/training" />
      {loadError && courses.length === 0 ? (
        <p className="training-banner is-error">
          Teach could not load just now. Refresh this page. Download Excel still
          works.
        </p>
      ) : (
        <TrainingCurriculumPanel
          courses={courses}
          canManage
          initialLessonId={params.lesson}
          copyUrl={learnPracticeCopyUrl()}
        />
      )}
    </CrmSubmoduleShell>
  );
}
