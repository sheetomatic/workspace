import Link from "next/link";
import { MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import { LearnNav } from "@/components/learn/learn-nav";
import { listPublishedCourses, TRACK_LABEL } from "@/lib/learn/catalog";
import { lessonHasTeachingContent } from "@/lib/learn/media";
import { requireStudent } from "@/lib/learn/require";
import { LearnWorkbookBar } from "@/components/learn/learn-workbook-bar";
import { learnMsmeCopyUrl } from "@/lib/learn/msme-sheet";
import "@/components/learn/learn-panel.css";

export default async function LearnCoursesPage() {
  const enrollment = await requireStudent();
  const courses = await listPublishedCourses();

  return (
    <MarketingPage>
      <SiteHeader />
      <main className="learn-shell">
        <div className="learn-wide">
          <LearnNav name={enrollment.name} current="learn" />
          <h1>Learn</h1>
          <p className="learn-lead">
            Follow the path the way your trainer teaches it — Sheets, then
            AppSheet, then Looker Studio. One shop file for every formula.
          </p>
          <LearnWorkbookBar copyUrl={learnMsmeCopyUrl()} />
          <ul className="learn-course-grid">
            {courses.map((course) => {
              const ready = course.lessons.filter(lessonHasTeachingContent).length;
              return (
                <li key={course.id}>
                  <Link href={`/learn/courses/${course.track.toLowerCase()}`}>
                    <strong>{TRACK_LABEL[course.track]}</strong>
                    <span>{course.summary}</span>
                    <em>
                      {ready} ready · {course.lessons.length} lessons
                    </em>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </main>
      <SiteFooter />
    </MarketingPage>
  );
}
