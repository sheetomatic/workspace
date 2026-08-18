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

  return (
    <LearnPageShell>
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
                    <em>{slotStatusLabel(slot.status, live)}</em>
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
