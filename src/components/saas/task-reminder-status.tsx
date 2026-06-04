"use client";

import { useState, useTransition } from "react";
import { Mail, MessageCircle, Phone, RefreshCw } from "lucide-react";
import { resendTaskAssignmentReminders } from "@/app/app/tasks/actions";
import type { TaskRow } from "@/components/saas/task-list";
import { formatWhatsAppPhone } from "@/lib/phone";
import { formatTaskAssignedDate } from "@/lib/tasks";

function reminderSentLabel(sentAt: Date | null, requested: boolean) {
  if (!requested) {
    return { label: "Off", tone: "muted" as const };
  }
  if (sentAt) {
    return {
      label: `Sent ${formatTaskAssignedDate(sentAt)}`,
      tone: "sent" as const,
    };
  }
  return { label: "Not sent", tone: "failed" as const };
}

export function TaskReminderStatus({
  task,
  showResend = false,
}: {
  task: TaskRow;
  showResend?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const assigneePhone =
    "phone" in task.assignee ? task.assignee.phone : null;

  const email = reminderSentLabel(task.emailAssignmentSentAt, task.remindViaEmail);
  const whatsapp = reminderSentLabel(
    task.whatsappAssignmentSentAt,
    task.remindViaWhatsApp,
  );

  function resend() {
    startTransition(async () => {
      const result = await resendTaskAssignmentReminders(task.id);
      setFeedback(result.message);
    });
  }

  return (
    <section
      aria-label="Assignment notifications"
      className={`ws-task-reminder-status${pending ? " is-loading" : ""}`}
    >
      <div className="ws-task-reminder-status-head">
        <h4>Notifications</h4>
        {showResend &&
        ((task.remindViaEmail && !task.emailAssignmentSentAt) ||
          (task.remindViaWhatsApp && !task.whatsappAssignmentSentAt)) ? (
          <button
            className="ws-task-reminder-resend"
            disabled={pending}
            type="button"
            onClick={resend}
          >
            <RefreshCw aria-hidden size={14} />
            Resend
          </button>
        ) : null}
      </div>

      <dl className="ws-task-reminder-status-grid">
        <div className="ws-task-reminder-status-item">
          <dt>
            <Mail aria-hidden size={14} />
            Email
          </dt>
          <dd>
            <span className={`ws-task-reminder-pill tone-${email.tone}`}>
              {email.label}
            </span>
            {!task.remindViaEmail ? (
              <span className="ws-task-reminder-hint">Not requested on assign</span>
            ) : null}
          </dd>
        </div>

        <div className="ws-task-reminder-status-item">
          <dt>
            <MessageCircle aria-hidden size={14} />
            WhatsApp
          </dt>
          <dd>
            <span className={`ws-task-reminder-pill tone-${whatsapp.tone}`}>
              {whatsapp.label}
            </span>
            {task.remindViaWhatsApp ? (
              <span className="ws-task-reminder-hint">
                <Phone aria-hidden size={12} />
                {assigneePhone
                  ? formatWhatsAppPhone(assigneePhone)
                  : "No WhatsApp number on assignee"}
              </span>
            ) : (
              <span className="ws-task-reminder-hint">Not requested on assign</span>
            )}
            {task.remindViaWhatsApp &&
            !task.whatsappAssignmentSentAt &&
            assigneePhone ? (
              <>
                <span className="ws-task-reminder-hint">
                  Template: <strong>assign_task_new</strong> (en)
                </span>
                <span className="ws-task-reminder-hint ws-task-reminder-hint-warn">
                  Delivery failed. Use Resend after checking RedLava API key and Phone ID in
                  Channels settings.
                </span>
              </>
            ) : null}
          </dd>
        </div>
      </dl>
      {feedback ? (
        <p className="ws-task-reminder-feedback" role="status">
          {feedback}
        </p>
      ) : null}
    </section>
  );
}
