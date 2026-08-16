import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import { LearnNav } from "@/components/learn/learn-nav";
import { getPublishedCourse, parseTrainingTrack, TRACK_LABEL } from "@/lib/learn/catalog";
import { requireStudent } from "@/lib/learn/require";
import { prisma } from "@/lib/db";
import "@/components/learn/learn-panel.css";

export default async function LearnTrackPage({
  params,
}: {
  params: Promise<{ track: string }>;
}) {
  const enrollment = await requireStudent();
  const { track: raw } = await params;
  const track = parseTrainingTrack(raw);
  if (!track) notFound();
  const course = await getPublishedCourse(track);
  if (!course) notFound();

  const done = await prisma.trainingLessonProgress.findMany({
    where: {
      enrollmentId: enrollment.id,
      lessonId: { in: course.lessons.map((item) => item.id) },
      completedAt: { not: null },
    },
    select: { lessonId: true },
  });
  const doneIds = new Set(done.map((row) => row.lessonId));

  const modules = new Map<string, typeof course.lessons>();
  for (const lesson of course.lessons) {
    const key = lesson.moduleLabel || "Lessons";
    const list = modules.get(key) ?? [];
    list.push(lesson);
    modules.set(key, list);
  }

  return (
    <MarketingPage>
      <SiteHeader />
      <main className="learn-shell">
        <div className="learn-wide">
          <LearnNav name={enrollment.name} current="courses" />
          <p className="learn-crumb">
            <Link href="/learn/courses">Courses</Link> / {TRACK_LABEL[track]}
          </p>
          <h1>{course.title}</h1>
          <p className="learn-lead">{course.summary}</p>

          {[...modules.entries()].map(([moduleLabel, lessons]) => (
            <section key={moduleLabel} className="learn-module">
              <h2>{moduleLabel}</h2>
              <ol className="learn-lesson-list">
                {lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <Link href={`/learn/courses/${track.toLowerCase()}/${lesson.slug}`}>
                      <strong>{lesson.title}</strong>
                      <span>{lesson.summary}</span>
                      {doneIds.has(lesson.id) ? <em>Done</em> : <em>Open</em>}
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </MarketingPage>
  );
}
