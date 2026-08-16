import { MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import { LearnNav } from "@/components/learn/learn-nav";
import { LearnSessionMaterials } from "@/components/learn/learn-session-materials";
import { requireStudent } from "@/lib/learn/require";
import { formatSlotWhen } from "@/lib/courses/slots";
import "@/components/learn/learn-panel.css";

export default async function LearnContentsPage() {
  const enrollment = await requireStudent();
  const sessions = enrollment.slots.filter((slot) => slot.materials.length > 0);

  return (
    <MarketingPage>
      <SiteHeader />
      <main className="learn-shell">
        <div className="learn-wide">
          <LearnNav name={enrollment.name} current="contents" />
          <h1>Contents</h1>
          <p className="learn-lead">
            Recordings and documents your trainer uploads after each session.
          </p>
          {sessions.length === 0 ? (
            <p className="learn-muted">
              Nothing uploaded yet. After a class is marked done, the recording
              and files will appear here.
            </p>
          ) : (
            <ol className="learn-content-list">
              {sessions.map((slot) => (
                <li key={slot.id}>
                  <strong>
                    Session {slot.sessionNumber}
                    {slot.status === "COMPLETED" ? " · Done" : ""}
                  </strong>
                  <span>{formatSlotWhen(slot.startsAt)}</span>
                  <LearnSessionMaterials materials={slot.materials} />
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
