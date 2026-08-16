import Link from "next/link";
import { MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import { LearnNav } from "@/components/learn/learn-nav";
import { listPublishedCourses, TRACK_LABEL } from "@/lib/learn/catalog";
import { requireStudent } from "@/lib/learn/require";
import { formatSlotWhen } from "@/lib/courses/slots";
import { prisma } from "@/lib/db";
import "@/components/learn/learn-panel.css";

export default async function LearnHomePage() {
  const enrollment = await requireStudent();
  const courses = await listPublishedCourses();
  const done = await prisma.trainingLessonProgress.count({
    where: { enrollmentId: enrollment.id, completedAt: { not: null } },
  });
  const upcoming = enrollment.slots.find(
    (slot) => slot.status === "SCHEDULED" && slot.startsAt.getTime() >= Date.now(),
  );
  const meetUrl =
    enrollment.meetUrl ||
    enrollment.slots.find((slot) => slot.meetUrl)?.meetUrl ||
    null;

  return (
    <MarketingPage>
      <SiteHeader />
      <main className="learn-shell">
        <div className="learn-wide">
          <LearnNav name={enrollment.name} current="home" />
          <h1>Welcome, {enrollment.name.split(" ")[0] || enrollment.name}</h1>
          <p className="learn-lead">
            Your live 1:1 sessions and self-learn library are here. Content
            slots are ready — we will keep filling lessons from the training
            sheet (Sheets → AppSheet → Looker Studio).
          </p>

          <section className="learn-cards">
            <article className="learn-card">
              <h2>Next live class</h2>
              {upcoming ? (
                <>
                  <p>{formatSlotWhen(upcoming.startsAt)}</p>
                  {meetUrl ? (
                    <a className="learn-btn-primary" href={meetUrl} target="_blank" rel="noreferrer">
                      Join Google Meet
                    </a>
                  ) : (
                    <p className="learn-muted">Meet link will appear when your trainer adds it.</p>
                  )}
                </>
              ) : (
                <p className="learn-muted">No upcoming session on file yet.</p>
              )}
              <Link href="/learn/schedule">View full schedule</Link>
            </article>
            <article className="learn-card">
              <h2>Progress</h2>
              <p>
                {done} lesson{done === 1 ? "" : "s"} marked done
              </p>
              <Link href="/learn/courses">Continue learning</Link>
            </article>
          </section>

          <h2 className="learn-section-title">Courses</h2>
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
