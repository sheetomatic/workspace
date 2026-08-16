import Link from "next/link";
import { MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import { LearnNav } from "@/components/learn/learn-nav";
import { LearnSessionMaterials } from "@/components/learn/learn-session-materials";
import { requireStudent } from "@/lib/learn/require";
import { formatSlotWhen } from "@/lib/courses/slots";
import "@/components/learn/learn-panel.css";

export default async function LearnHomePage() {
  const enrollment = await requireStudent();
  const completed = enrollment.slots.filter((slot) => slot.status === "COMPLETED")
    .length;
  const upcoming = enrollment.slots.find(
    (slot) => slot.status === "SCHEDULED" && slot.startsAt.getTime() >= Date.now(),
  );
  const latestContent = [...enrollment.slots]
    .reverse()
    .find((slot) => slot.materials.length > 0);
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
            Status and schedule for live classes. Learn is the full course in
            your trainer&apos;s style. Class files are recordings from each session.
          </p>

          <section className="learn-cards">
            <article className="learn-card">
              <h2>Learn</h2>
              <p>Sheets → AppSheet → Looker, written the way your trainer teaches.</p>
              <Link href="/learn/courses">Open the course</Link>
            </article>
            <article className="learn-card">
              <h2>Status</h2>
              <p>
                {completed} of {enrollment.slots.length} sessions complete
              </p>
              <Link href="/learn/schedule">View schedule</Link>
            </article>
            <article className="learn-card">
              <h2>Next live class</h2>
              {upcoming ? (
                <>
                  <p>{formatSlotWhen(upcoming.startsAt)}</p>
                  {meetUrl ? (
                    <a
                      className="learn-btn-primary"
                      href={meetUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Join Google Meet
                    </a>
                  ) : (
                    <p className="learn-muted">
                      Meet link will appear when your trainer adds it.
                    </p>
                  )}
                </>
              ) : (
                <p className="learn-muted">No upcoming session on file yet.</p>
              )}
              <Link href="/learn/schedule">Full schedule</Link>
            </article>
            <article className="learn-card">
              <h2>Latest content</h2>
              {latestContent ? (
                <>
                  <p>Session {latestContent.sessionNumber}</p>
                  <LearnSessionMaterials materials={latestContent.materials} />
                </>
              ) : (
                <p className="learn-muted">
                  Recordings and documents appear after your trainer uploads them.
                </p>
              )}
              <Link href="/learn/contents">All contents</Link>
            </article>
          </section>
        </div>
      </main>
      <SiteFooter />
    </MarketingPage>
  );
}
