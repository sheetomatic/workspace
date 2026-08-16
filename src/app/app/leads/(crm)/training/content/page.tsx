import { CrmSubmoduleShell } from "@/components/saas/crm-submodule-shell";
import {
  TrainingCurriculumPanel,
  type CurriculumCourseView,
} from "@/components/saas/training-curriculum-panel";
import { TrainingTabs } from "@/components/saas/training-tabs";
import "@/components/saas/leads-machine.css";
import "@/components/saas/training-students-panel.css";
import { listTrainingCurriculum } from "@/lib/learn/catalog";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";
import { requireCrmSubModule } from "@/lib/crm/crm-access";
import { learnMsmeCopyUrl } from "@/lib/learn/msme-sheet";

export default async function CrmTrainingContentPage({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string }>;
}) {
  const user = await requireSession(undefined, { module: "CRM" });
  await requireCrmSubModule(user, "training");
  const params = await searchParams;
  const coursesRaw = await listTrainingCurriculum();
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
      kpis={[
        { label: "Tracks", value: String(courses.length), accent: "blue" },
        { label: "Lessons", value: String(total) },
        { label: "Ready for students", value: String(ready), accent: "success" },
      ]}
    >
      <TrainingTabs current="curriculum" />
      <TrainingCurriculumPanel
        courses={courses}
        canManage={hasMinimumRole(user.role, "STAFF")}
        initialLessonId={params.lesson}
        copyUrl={learnMsmeCopyUrl()}
      />
    </CrmSubmoduleShell>
  );
}
