import type { FmsNotificationHealth } from "@/lib/fms/notification-health";

function formatWhen(iso: string | null) {
  if (!iso) {
    return "Never";
  }
  return new Date(iso).toLocaleString("en-IN");
}

export function FmsNotificationHealthPanel({
  health,
}: {
  health: FmsNotificationHealth;
}) {
  const issues: string[] = [];

  if (!health.cronSecretConfigured) {
    issues.push("CRON_SECRET is not set on the server � scheduled reminders will not run.");
  }
  if (!health.lastFmsReminderRun) {
    issues.push("FMS reminder cron has not run yet.");
  } else if (health.lastFmsReminderOk === false) {
    issues.push(`Last cron run failed: ${health.lastFmsReminderSummary ?? "unknown error"}`);
  }
  if (!health.whatsappReady) {
    issues.push("WhatsApp is not fully connected for inbound/outbound alerts.");
  }
  if (!health.emailConfigured) {
    issues.push("Email (Resend) is not configured � email alerts will not send.");
  }
  if (health.unassignedActiveSteps > 0) {
    issues.push(
      `${health.unassignedActiveSteps} active stop(s) have no owner � doers cannot complete until claimed or reassigned.`,
    );
  }
  if (health.inProgressWithoutPhone > 0) {
    issues.push(
      `${health.inProgressWithoutPhone} assigned doer(s) have no phone number � WhatsApp alerts will skip them.`,
    );
  }

  return (
    <section className="ws-sf-card ws-fms-notify-health">
      <header className="ws-fms-section-heading">
        <h2>Alert delivery health</h2>
        <p>WhatsApp, email, and cron status for FMS step notifications.</p>
      </header>

      <dl className="ws-fms-notify-health-grid">
        <div>
          <dt>Last reminder cron</dt>
          <dd>{formatWhen(health.lastFmsReminderRun)}</dd>
        </div>
        <div>
          <dt>Cron status</dt>
          <dd>
            {health.lastFmsReminderOk == null
              ? "Unknown"
              : health.lastFmsReminderOk
                ? "OK"
                : "Failed"}
          </dd>
        </div>
        <div>
          <dt>WhatsApp</dt>
          <dd>{health.whatsappReady ? "Ready" : "Needs setup"}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{health.emailConfigured ? "Configured" : "Not configured"}</dd>
        </div>
      </dl>

      {issues.length > 0 ? (
        <ul className="ws-fms-notify-health-issues">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : (
        <p className="ws-form-success">All alert channels look healthy.</p>
      )}

      {health.whatsappBlockers.length > 0 ? (
        <details className="ws-fms-notify-health-details">
          <summary>WhatsApp setup notes</summary>
          <ul>
            {health.whatsappBlockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
