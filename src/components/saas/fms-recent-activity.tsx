import { FMS_AUDIT_LABELS } from "@/lib/fms/audit";
import type { FmsAuditAction } from "@prisma/client";

type AuditRow = {
  id: string;
  action: FmsAuditAction;
  summary: string;
  createdAt: Date;
  user: { name: string | null; email: string };
};

function formatWhen(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function FmsRecentActivity({ events }: { events: AuditRow[] }) {
  if (events.length === 0) {
    return null;
  }

  return (
    <section className="ws-sf-list-view" aria-label="Recent FMS activity">
      <header className="ws-sf-list-view-header">
        <div className="ws-sf-list-view-title">
          <h2>Recent activity</h2>
          <span className="ws-sf-list-view-count">
            {events.length} event{events.length === 1 ? "" : "s"}
          </span>
        </div>
      </header>
      <ul className="ws-fms-audit-list ws-fms-recent-activity-list">
        {events.map((event) => {
          const actor = event.user.name ?? event.user.email.split("@")[0];
          return (
            <li key={event.id} className="ws-fms-audit-row">
              <div>
                <strong>{FMS_AUDIT_LABELS[event.action] ?? event.action}</strong>
                <p>{event.summary}</p>
              </div>
              <span className="ws-fms-muted">
                {actor} | {formatWhen(event.createdAt)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
