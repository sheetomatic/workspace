import Link from "next/link";
import { MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import { LearnNav } from "@/components/learn/learn-nav";
import { listPublishedCourses, TRACK_LABEL } from "@/lib/learn/catalog";
import { requireStudent } from "@/lib/learn/require";
import "@/components/learn/learn-panel.css";

export default async function LearnCoursesPage() {
  const enrollment = await requireStudent();
  const courses = await listPublishedCourses();

  return (
    <MarketingPage>
      <SiteHeader />
      <main className="learn-shell">
        <div className="learn-wide">
          <LearnNav name={enrollment.name} current="courses" />
          <h1>Learning library</h1>
          <p className="learn-lead">
            Google Sheets curriculum is loaded from the training sheet. AppSheet
            and Looker Studio tracks are ready for lesson content next.
          </p>
          <ul className="learn-course-grid">
            {courses.map((course) => (
              <li key={course.id}>
                <Link href={`/learn/courses/${course.track.toLowerCase()}`}>
                  <strong>{TRACK_LABEL[course.track]}</strong>
                  <span>{course.summary}</span>
                  <em>{course.lessons.length} lessons</em>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <SiteFooter />
    </MarketingPage>
  );
}
