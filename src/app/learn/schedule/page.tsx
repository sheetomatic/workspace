import { LearnNav } from "@/components/learn/learn-nav";
import { LearnPageShell } from "@/components/learn/learn-page-shell";
import { LearnSessionMaterials } from "@/components/learn/learn-session-materials";
import { requireStudent } from "@/lib/learn/require";
import { formatSlotWhen } from "@/lib/courses/slots";
import { isClassroomLive, studentClassPath } from "@/lib/learn/classroom";
import { courseCohortLabel } from "@/lib/content/courses-enrollment";
import "@/components/learn/learn-panel.css";

function slotStatusLabel(status: string, live: boolean) {
  if (live) return "Live";
  if (status === "COMPLETED") return "Done";
  if (status === "CANCELLED") return "Cancelled";
  return "Scheduled";
}

export default async function LearnSchedulePage() {
  const enrollment = await requireStudent();
  const meetUrl =
    enrollment.meetUrl ||
    enrollment.slots.find((slot) => slot.meetUrl)?.meetUrl ||
    null;
  const groupMeetUrl = enrollment.groupMeetUrl?.trim() || null;

  return (
    <LearnPageShell>
      <main className="learn-shell">
        <div className="learn-wide">
          <LearnNav name={enrollment.name} current="schedule" />
          <header className="learn-page-head">
          <p className="learn-kicker">Plan</p>
          <h1>Your schedule</h1>
          <p className="learn-lead">
            {courseCohortLabel(enrollment.cohort, enrollment.weekdaysCsv)} ·{" "}
            {enrollment.sessionTimeIst} IST
            {groupMeetUrl ? (
              <>
                {" · "}
                <a href={groupMeetUrl} target="_blank" rel="noreferrer">
                  {enrollment.groupLabel?.trim()
                    ? `Join group class (${enrollment.groupLabel.trim()})`
                    : "Join group class"}
                </a>
              </>
            ) : null}
            {meetUrl && meetUrl !== groupMeetUrl ? (
              <>
                {" · "}
                <a href={meetUrl} target="_blank" rel="noreferrer">
                  Google Meet
                </a>
              </>
            ) : null}
          </p>
          </header>
          {enrollment.slots.length === 0 ? (
            <p className="learn-muted">No sessions booked yet.</p>
          ) : (
            <ol className="learn-schedule-list">
              {enrollment.slots.map((slot) => {
                const live = isClassroomLive(slot);
                return (
                  <li key={slot.id}>
                    <strong>#{slot.sessionNumber}</strong>
                    <div>
                      <span>{formatSlotWhen(slot.startsAt)}</span>
                      {live ? (
                        <a
                          className="learn-btn-primary"
                          href={studentClassPath(slot.id)}
                        >
                          Join class
                        </a>
                      ) : null}
                      <LearnSessionMaterials materials={slot.materials} />
                    </div>
                    <em className={`learn-status is-${live ? "live" : slot.status.toLowerCase()}`}>
                      {slotStatusLabel(slot.status, live)}
                    </em>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </main>
    </LearnPageShell>
  );
}
