import Link from "next/link";
import { LearnNav } from "@/components/learn/learn-nav";
import { LearnPageShell } from "@/components/learn/learn-page-shell";
import { LearnSessionMaterials } from "@/components/learn/learn-session-materials";
import { requireStudent } from "@/lib/learn/require";
import { formatSlotWhen } from "@/lib/courses/slots";
import { isClassroomLive, studentClassPath } from "@/lib/learn/classroom";
import "@/components/learn/learn-panel.css";

function greetingIst() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function LearnHomePage() {
  const enrollment = await requireStudent();
  const firstName = enrollment.name.split(" ")[0] || enrollment.name;
  const completed = enrollment.slots.filter((slot) => slot.status === "COMPLETED")
    .length;
  const total = enrollment.slots.length;
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const live = enrollment.slots.find((slot) => isClassroomLive(slot));
  const upcoming =
    live ??
    enrollment.slots.find(
      (slot) =>
        slot.status === "SCHEDULED" && slot.startsAt.getTime() >= Date.now(),
    );
  const latestContent = [...enrollment.slots]
    .reverse()
    .find((slot) => slot.materials.length > 0);
  const meetUrl =
    enrollment.meetUrl ||
    enrollment.slots.find((slot) => slot.meetUrl)?.meetUrl ||
    null;
  const groupMeetUrl = enrollment.groupMeetUrl?.trim() || null;

  return (
    <LearnPageShell>
      <main className="learn-shell">
        <div className="learn-wide">
          <LearnNav name={enrollment.name} current="home" />

          <header className="learn-hero">
            <p className="learn-kicker">Student studio</p>
            <h1>
              {greetingIst()}, {firstName}
            </h1>
            <p className="learn-lead">
              Your live classes, course, and recordings — the way your trainer
              teaches.
            </p>
            <div className="learn-progress" aria-label={`${completed} of ${total} sessions complete`}>
              <div className="learn-progress-copy">
                <strong>
                  {completed}
                  <span> / {total || 0}</span>
                </strong>
                <em>sessions complete</em>
              </div>
              <div className="learn-progress-track">
                <span style={{ width: `${pct}%` }} />
              </div>
            </div>
          </header>

          <section className={`learn-spotlight${live ? " is-live" : ""}`}>
            <p className="learn-kicker">
              {live ? "Live now" : "Next live class"}
            </p>
            {upcoming ? (
              <>
                <h2>
                  Session {upcoming.sessionNumber}
                  {upcoming.title ? ` · ${upcoming.title}` : ""}
                </h2>
                <p>{formatSlotWhen(upcoming.startsAt)}</p>
                <div className="learn-spotlight-actions">
                  {live ? (
                    <a
                      className="learn-btn-primary"
                      href={studentClassPath(live.id)}
                    >
                      Join class
                    </a>
                  ) : groupMeetUrl ? (
                    <a
                      className="learn-btn-primary"
                      href={groupMeetUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Join group class
                    </a>
                  ) : meetUrl ? (
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
                      Join appears when your trainer starts the room.
                    </p>
                  )}
                  {groupMeetUrl && live ? (
                    <a
                      className="learn-btn-secondary"
                      href={groupMeetUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Group Meet
                    </a>
                  ) : null}
                  {meetUrl && meetUrl !== groupMeetUrl && (live || groupMeetUrl) ? (
                    <a
                      className="learn-btn-secondary"
                      href={meetUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      1:1 Meet
                    </a>
                  ) : null}
                  <Link className="learn-text-link" href="/learn/schedule">
                    Full schedule
                  </Link>
                </div>
              </>
            ) : (
              <p className="learn-muted">No upcoming session on file yet.</p>
            )}
          </section>

          <section className="learn-cards">
            <article className="learn-card">
              <p className="learn-card-kicker">Course</p>
              <h2>Learn</h2>
              <p>Sheets → AppSheet → Looker, written in your trainer&apos;s voice.</p>
              <Link href="/learn/courses">Open the course</Link>
            </article>
            <article className="learn-card">
              <p className="learn-card-kicker">Plan</p>
              <h2>Schedule</h2>
              <p>
                {total
                  ? `${total - completed} session${total - completed === 1 ? "" : "s"} still ahead.`
                  : "Your timetable will appear after booking."}
              </p>
              <Link href="/learn/schedule">View schedule</Link>
            </article>
            <article className="learn-card">
              <p className="learn-card-kicker">Library</p>
              <h2>Class files</h2>
              {latestContent ? (
                <>
                  <p>Latest: session {latestContent.sessionNumber}</p>
                  <LearnSessionMaterials materials={latestContent.materials} />
                </>
              ) : (
                <p>Recordings land here after each class.</p>
              )}
              <Link href="/learn/contents">All contents</Link>
            </article>
          </section>
        </div>
      </main>
    </LearnPageShell>
  );
}
