import { MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import { LearnNav } from "@/components/learn/learn-nav";
import { requireStudent } from "@/lib/learn/require";
import { formatSlotWhen } from "@/lib/courses/slots";
import { courseCohortLabel } from "@/lib/content/courses-enrollment";
import "@/components/learn/learn-panel.css";

export default async function LearnSchedulePage() {
  const enrollment = await requireStudent();
  const meetUrl =
    enrollment.meetUrl ||
    enrollment.slots.find((slot) => slot.meetUrl)?.meetUrl ||
    null;

  return (
    <MarketingPage>
      <SiteHeader />
      <main className="learn-shell">
        <div className="learn-wide">
          <LearnNav name={enrollment.name} current="schedule" />
          <h1>Your schedule</h1>
          <p className="learn-lead">
            {courseCohortLabel(enrollment.cohort, enrollment.weekdaysCsv)} ·{" "}
            {enrollment.sessionTimeIst} IST
            {meetUrl ? (
              <>
                {" · "}
                <a href={meetUrl} target="_blank" rel="noreferrer">
                  Google Meet
                </a>
              </>
            ) : null}
          </p>
          {enrollment.slots.length === 0 ? (
            <p className="learn-muted">No sessions booked yet.</p>
          ) : (
            <ol className="learn-schedule-list">
              {enrollment.slots.map((slot) => (
                <li key={slot.id}>
                  <strong>#{slot.sessionNumber}</strong>
                  <span>{formatSlotWhen(slot.startsAt)}</span>
                  <em>{slot.status === "COMPLETED" ? "Done" : "Scheduled"}</em>
                </li>
              ))}
            </ol>
          )}
        </div>
      </main>
      <SiteFooter />
    </MarketingPage>
  );
}
