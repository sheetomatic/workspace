import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import { LearnLessonBody } from "@/components/learn/learn-lesson-body";
import { LearnNav } from "@/components/learn/learn-nav";
import { markLearnLessonDoneAction } from "@/app/learn/actions";
import { getPublishedLesson, parseTrainingTrack, TRACK_LABEL } from "@/lib/learn/catalog";
import { requireStudent } from "@/lib/learn/require";
import { prisma } from "@/lib/db";
import "@/components/learn/learn-panel.css";

export default async function LearnLessonPage({
  params,
}: {
  params: Promise<{ track: string; slug: string }>;
}) {
  const enrollment = await requireStudent();
  const { track: raw, slug } = await params;
  const track = parseTrainingTrack(raw);
  if (!track) notFound();
  const found = await getPublishedLesson(track, slug);
  if (!found) notFound();

  const { course, lesson, lessons } = found;
  const index = lessons.findIndex((item) => item.id === lesson.id);
  const prev = index > 0 ? lessons[index - 1] : null;
  const next = index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : null;
  const progress = await prisma.trainingLessonProgress.findUnique({
    where: {
      enrollmentId_lessonId: {
        enrollmentId: enrollment.id,
        lessonId: lesson.id,
      },
    },
  });

  return (
    <MarketingPage>
      <SiteHeader />
      <main className="learn-shell">
        <div className="learn-wide">
          <LearnNav name={enrollment.name} current="learn" />
          <p className="learn-crumb">
            <Link href="/learn/courses">Learn</Link>
            {" / "}
            <Link href={`/learn/courses/${track.toLowerCase()}`}>
              {TRACK_LABEL[track]}
            </Link>
            {lesson.moduleLabel ? ` / ${lesson.moduleLabel}` : ""}
          </p>
          <h1>{lesson.title}</h1>
          <p className="learn-lead">{lesson.summary}</p>

          <LearnLessonBody
            goal={lesson.goal}
            practicePrompt={lesson.practicePrompt}
            bodyMd={lesson.bodyMd}
            videoUrl={lesson.videoUrl}
            embedUrl={lesson.embedUrl}
          />

          <form action={markLearnLessonDoneAction}>
            <input type="hidden" name="lessonId" value={lesson.id} />
            <button
              type="submit"
              className="learn-btn-secondary"
              disabled={Boolean(progress?.completedAt)}
            >
              {progress?.completedAt ? "Practiced" : "I practiced this"}
            </button>
          </form>

          <div className="learn-pager">
            {prev ? (
              <Link href={`/learn/courses/${track.toLowerCase()}/${prev.slug}`}>
                ← {prev.title}
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link href={`/learn/courses/${track.toLowerCase()}/${next.slug}`}>
                {next.title} →
              </Link>
            ) : (
              <Link href={`/learn/courses/${track.toLowerCase()}`}>
                Back to {course.title}
              </Link>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </MarketingPage>
  );
}
