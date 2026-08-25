import { MessageCircle } from "lucide-react";
import { logoutHref } from "@/lib/auth-logout";

export function WhatsAppOnlyGate({
  organizationName,
  userName,
}: {
  organizationName: string;
  userName: string;
}) {
  return (
    <main className="saas-page" style={{ maxWidth: 480, margin: "48px auto" }}>
      <article className="saas-panel">
        <div className="saas-panel-head">
          <div>
            <h3>
              <MessageCircle size={18} aria-hidden />
              WhatsApp only
            </h3>
            <p>
              Hi {userName}. {organizationName} team members update tasks on
              WhatsApp only — no website panel.
            </p>
          </div>
        </div>
        <p>
          When a task is assigned, reply on that WhatsApp message:{" "}
          <strong>Start</strong>, <strong>Mark done</strong>, or{" "}
          <strong>Need help</strong>. Reminders keep coming until it is done.
        </p>
        <p>
          <a className="btn-ghost" href={logoutHref("/login")}>
            Sign out
          </a>
        </p>
      </article>
    </main>
  );
}
