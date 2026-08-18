import { LearnNav } from "@/components/learn/learn-nav";
import { LearnPageShell } from "@/components/learn/learn-page-shell";
import { LearnSessionMaterials } from "@/components/learn/learn-session-materials";
import { requireStudent } from "@/lib/learn/require";
import { formatSlotWhen } from "@/lib/courses/slots";
import "@/components/learn/learn-panel.css";

export default async function LearnContentsPage() {
  const enrollment = await requireStudent();
  const sessions = enrollment.slots.filter((slot) => slot.materials.length > 0);

  return (
    <LearnPageShell>
      <main className="learn-shell">
        <div className="learn-wide">
          <LearnNav name={enrollment.name} current="contents" />
          <header className="learn-page-head">
            <p className="learn-kicker">Library</p>
            <h1>Class files</h1>
            <p className="learn-lead">
              Recordings and documents from live sessions. The course itself is
              under Learn.
            </p>
          </header>
          {sessions.length === 0 ? (
            <div className="learn-empty">
              <p className="learn-kicker">Nothing yet</p>
              <h2>Files appear after class</h2>
              <p className="learn-muted">
                When your trainer pastes the Unlisted YouTube and notes, they
                show here as Watch and Open.
              </p>
            </div>
          ) : (
            <ol className="learn-content-list">
              {sessions.map((slot) => (
                <li key={slot.id}>
                  <div className="learn-content-head">
                    <strong>Session {slot.sessionNumber}</strong>
                    <em
                      className={`learn-status is-${slot.status.toLowerCase()}`}
                    >
                      {slot.status === "COMPLETED" ? "Done" : slot.status}
                    </em>
                  </div>
                  <span>{formatSlotWhen(slot.startsAt)}</span>
                  <LearnSessionMaterials materials={slot.materials} />
                </li>
              ))}
            </ol>
          )}
        </div>
      </main>
    </LearnPageShell>
  );
}
