import Link from "next/link";
import { MessageCircle, Settings } from "lucide-react";
import type { WorkspaceIntegrationStatus } from "@/lib/workspace-integration-status";

export function TaskIntegrationBanner({
  status,
  showWhatsAppLink = true,
}: {
  status: WorkspaceIntegrationStatus;
  showWhatsAppLink?: boolean;
}) {
  const issues: string[] = [];

  if (!status.whatsappConfigured) {
    issues.push("WhatsApp is not connected for this workspace");
  }
  if (!status.emailConfigured) {
    issues.push("Email reminders are not configured on the server");
  }

  if (issues.length === 0) {
    return null;
  }

  return (
    <div className="saas-form-message ws-task-integration-banner" role="status">
      <MessageCircle aria-hidden size={18} />
      <div>
        <strong>Reminder delivery</strong>
        <ul>
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
        {showWhatsAppLink && !status.whatsappConfigured ? (
          <p>
            <Link className="ws-task-integration-link" href="/ai/app/settings">
              <Settings aria-hidden size={14} />
              Connect WhatsApp in AI Settings
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
