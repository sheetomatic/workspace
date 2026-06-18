import type { FmsAuditAction } from "@prisma/client";
import { FMS_AUDIT_LABELS } from "@/lib/fms/audit";

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

export function FmsInstanceActivity({
  auditEvents,
}: {
  auditEvents: AuditRow[];
}) {
  if (auditEvents.length === 0) {
    return null;
  }

  return (
    <div className="ws-fms-activity-stack">
      <section className="ws-sf-card ws-fms-section">
          <header className="ws-fms-section-heading">
            <h2>Activity log</h2>
            <p>Who did what on this job.</p>
          </header>
          <ul className="ws-fms-audit-list">
            {auditEvents.map((event) => {
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
    </div>
  );
}
