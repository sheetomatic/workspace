import Link from "next/link";
import { LearnNav } from "@/components/learn/learn-nav";
import { LearnPageShell } from "@/components/learn/learn-page-shell";
import { listPublishedCourses, TRACK_LABEL } from "@/lib/learn/catalog";
import { lessonHasTeachingContent } from "@/lib/learn/media";
import { requireStudent } from "@/lib/learn/require";
import { LearnWorkbookBar } from "@/components/learn/learn-workbook-bar";
import { getLearnMsmeCopyUrl } from "@/lib/learn/publish-msme-sheet";
import "@/components/learn/learn-panel.css";

export default async function LearnCoursesPage() {
  const enrollment = await requireStudent();
  const courses = await listPublishedCourses();

  return (
    <LearnPageShell>
      <main className="learn-shell">
        <div className="learn-wide">
          <LearnNav name={enrollment.name} current="learn" />
          <header className="learn-page-head">
            <p className="learn-kicker">Course</p>
            <h1>Learn</h1>
            <p className="learn-lead">
              Sheets, then AppSheet, then Looker — one shop file for every
              formula.
            </p>
          </header>
          <LearnWorkbookBar copyUrl={await getLearnMsmeCopyUrl()} />
          <ol className="learn-course-grid">
            {courses.map((course, index) => {
              const ready = course.lessons.filter(lessonHasTeachingContent).length;
              const pct = course.lessons.length
                ? Math.round((ready / course.lessons.length) * 100)
                : 0;
              return (
                <li key={course.id}>
                  <Link
                    className="learn-course-card"
                    href={`/learn/courses/${course.track.toLowerCase()}`}
                  >
                    <span className="learn-card-kicker">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <strong>{TRACK_LABEL[course.track]}</strong>
                    <span>{course.summary}</span>
                    <div className="learn-progress-track" aria-hidden>
                      <span style={{ width: `${pct}%` }} />
                    </div>
                    <em>
                      {ready} ready · {course.lessons.length} lessons
                    </em>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </main>
    </LearnPageShell>
  );
}
