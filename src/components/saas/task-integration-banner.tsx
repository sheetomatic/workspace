import Link from "next/link";
import { Bot, MessageCircle, Settings } from "lucide-react";
import type { WorkspaceIntegrationStatus } from "@/lib/workspace-integration-status";

export function TaskIntegrationBanner({
  status,
  showWhatsAppLink = true,
}: {
  status: WorkspaceIntegrationStatus;
  showWhatsAppLink?: boolean;
}) {
  const aiIssues: string[] = [];
  const reminderIssues: string[] = [];

  if (!status.openaiConfigured) {
    aiIssues.push("Voice and AI task parsing need OPENAI_API_KEY on the server");
  }
  if (!status.whatsappConfigured) {
    reminderIssues.push("WhatsApp is not connected for this workspace");
  }
  if (!status.emailConfigured) {
    reminderIssues.push("Email reminders are not configured on the server");
  }

  if (aiIssues.length === 0 && reminderIssues.length === 0) {
    return null;
  }

  return (
    <div className="ws-task-integration-banners" role="status">
      {aiIssues.length > 0 ? (
        <div className="saas-form-message ws-task-integration-banner ws-task-integration-banner-ai">
          <Bot aria-hidden size={18} />
          <div>
            <strong>Task AI</strong>
            <ul>
              {aiIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
      {reminderIssues.length > 0 ? (
        <div className="saas-form-message ws-task-integration-banner">
          <MessageCircle aria-hidden size={18} />
          <div>
            <strong>Reminder delivery</strong>
            <ul>
              {reminderIssues.map((issue) => (
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
      ) : null}
    </div>
  );
}
