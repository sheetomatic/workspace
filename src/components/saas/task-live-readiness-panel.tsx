import Link from "next/link";
import { CheckCircle2, Mail, MessageCircle, Users } from "lucide-react";
import { SheetomaticAiMark } from "@/components/saas/sheetomatic-ai-mark";
import type { WorkspaceIntegrationStatus } from "@/lib/workspace-integration-status";

type TaskReadinessMember = {
  id: string;
  name: string | null;
  phone: string | null;
};

type ReadinessItem = {
  id: string;
  label: string;
  description: string;
  ready: boolean;
  icon?: typeof MessageCircle;
  useAiMark?: boolean;
  href?: string;
  action?: string;
  optional?: boolean;
};

export function TaskLiveReadinessPanel({
  status,
  members,
  showCreate,
}: {
  status: WorkspaceIntegrationStatus;
  members: TaskReadinessMember[];
  showCreate: boolean;
}) {
  if (!showCreate) {
    return null;
  }

  const membersWithPhone = members.filter((member) => member.phone?.trim()).length;
  const teamPhonesReady = members.length > 0 && membersWithPhone === members.length;

  const items: ReadinessItem[] = [
    {
      id: "ai",
      label: "Task AI",
      description: status.openaiConfigured
        ? "Voice and text parsing are available."
        : "AI parsing is not enabled — contact your Sheetomatic admin.",
      ready: status.openaiConfigured,
      useAiMark: true,
      href: "/app/settings?tab=task-ai",
      action: "Task AI settings",
    },
    {
      id: "whatsapp",
      label: "WhatsApp reminders",
      description: status.whatsappConfigured
        ? "Task assignment and due reminders can go by WhatsApp."
        : "Save Sheetomatic WhatsApp API key and Phone ID.",
      ready: status.whatsappConfigured,
      icon: MessageCircle,
      href: "/ai/app/settings#whatsapp-connection",
      action: "Connect",
    },
    {
      id: "team",
      label: "Team numbers",
      description:
        members.length === 0
          ? "Add team members before assigning work."
          : `${membersWithPhone}/${members.length} assignable members have WhatsApp numbers.`,
      ready: teamPhonesReady,
      icon: Users,
      href: "/app/team",
      action: "Team",
    },
    {
      id: "email",
      label: "Email reminders",
      description: status.emailConfigured
        ? "Email reminders are available."
        : "Optional for launch; WhatsApp can be primary.",
      ready: status.emailConfigured,
      optional: true,
      icon: Mail,
    },
  ];

  const requiredReady = items.filter((item) => !item.optional).every((item) => item.ready);

  return (
    <section className="ws-task-live-panel" aria-label="Tasks launch readiness">
      <div className="ws-task-live-head">
        <div>
          <p className="ws-task-live-kicker">Launch readiness</p>
          <h2>{requiredReady ? "Tasks + AI are ready" : "Finish Tasks + AI setup"}</h2>
        </div>
        <span className={`ws-task-live-status${requiredReady ? " is-ready" : ""}`}>
          <CheckCircle2 size={14} aria-hidden />
          {requiredReady ? "Ready for live" : "Action needed"}
        </span>
      </div>

      <div className="ws-task-live-grid">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              className={`ws-task-live-item${item.ready ? " is-ready" : ""}`}
              key={item.id}
            >
              <span className="ws-task-live-icon" aria-hidden>
                {item.useAiMark ? (
                  <SheetomaticAiMark size={16} />
                ) : Icon ? (
                  <Icon size={16} />
                ) : null}
              </span>
              <div>
                <strong>{item.label}</strong>
                <p>{item.description}</p>
                {!item.ready && item.href ? (
                  <Link href={item.href}>{item.action ?? "Open"}</Link>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
