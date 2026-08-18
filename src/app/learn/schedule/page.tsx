import { LearnJoinActions } from "@/components/learn/learn-join-actions";
import { LearnNav } from "@/components/learn/learn-nav";
import { LearnPageShell } from "@/components/learn/learn-page-shell";
import { LearnSessionMaterials } from "@/components/learn/learn-session-materials";
import { requireStudent } from "@/lib/learn/require";
import { formatSlotWhen } from "@/lib/courses/slots";
import { isClassroomLive } from "@/lib/learn/classroom";
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
  const live = enrollment.slots.find((slot) => isClassroomLive(slot));

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
            </p>
          </header>

          <section className={`learn-spotlight${live ? " is-live" : ""}`}>
            <p className="learn-kicker">{live ? "Live now" : "Join"}</p>
            <h2>
              {live
                ? `Session ${live.sessionNumber} is in progress`
                : groupMeetUrl || meetUrl
                  ? "Join with one tap"
                  : "Waiting for class"}
            </h2>
            <p>
              {live
                ? formatSlotWhen(live.startsAt)
                : "Use Join class when the trainer starts, or Meet if that link was shared."}
            </p>
            <div className="learn-spotlight-actions">
              <LearnJoinActions
                liveSlotId={live?.id}
                groupMeetUrl={groupMeetUrl}
                groupLabel={enrollment.groupLabel}
                meetUrl={meetUrl}
              />
            </div>
          </section>

          {enrollment.slots.length === 0 ? (
            <p className="learn-muted">No sessions booked yet.</p>
          ) : (
            <ol className="learn-schedule-list">
              {enrollment.slots.map((slot) => {
                const slotLive = isClassroomLive(slot);
                const canJoin =
                  slotLive ||
                  (slot.status === "SCHEDULED" && Boolean(groupMeetUrl || meetUrl));
                return (
                  <li key={slot.id} className={slotLive ? "is-live" : undefined}>
                    <strong>#{slot.sessionNumber}</strong>
                    <div className="learn-schedule-copy">
                      <span>{formatSlotWhen(slot.startsAt)}</span>
                      {canJoin ? (
                        <LearnJoinActions
                          compact
                          liveSlotId={slotLive ? slot.id : null}
                          groupMeetUrl={
                            slot.status === "SCHEDULED" ? groupMeetUrl : null
                          }
                          groupLabel={enrollment.groupLabel}
                          meetUrl={slot.status === "SCHEDULED" ? meetUrl : null}
                        />
                      ) : null}
                      <LearnSessionMaterials materials={slot.materials} />
                    </div>
                    <em
                      className={`learn-status is-${slotLive ? "live" : slot.status.toLowerCase()}`}
                    >
                      {slotStatusLabel(slot.status, slotLive)}
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
