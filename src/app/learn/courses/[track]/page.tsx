import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import { LearnNav } from "@/components/learn/learn-nav";
import { getPublishedCourse, parseTrainingTrack, TRACK_LABEL } from "@/lib/learn/catalog";
import { lessonHasTeachingContent } from "@/lib/learn/media";
import { requireStudent } from "@/lib/learn/require";
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
          <LearnNav name={enrollment.name} current="learn" />
          <p className="learn-crumb">
            <Link href="/learn/courses">Learn</Link>
            {" / "}
            {TRACK_LABEL[track]}
          </p>
          <h1>{course.title}</h1>
          <p className="learn-lead">{course.summary}</p>
          {[...modules.entries()].map(([moduleLabel, lessons]) => (
            <section key={moduleLabel} className="learn-module">
              <h2>{moduleLabel}</h2>
              <ul className="learn-lesson-list">
                {lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <Link href={`/learn/courses/${track.toLowerCase()}/${lesson.slug}`}>
                      <strong>{lesson.title}</strong>
                      <span>{lesson.summary}</span>
                      <em>
                        {lessonHasTeachingContent(lesson)
                          ? "Ready"
                          : "After class"}
                      </em>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </MarketingPage>
  );
}
