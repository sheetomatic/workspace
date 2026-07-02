"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Bell, Mail, MessageCircle, Phone, RefreshCw } from "lucide-react";
import {
  resendTaskAssignmentReminders,
  resendTaskDueReminders,
} from "@/app/app/tasks/actions";
import type { TaskRow } from "@/components/saas/task-list";
import { formatWhatsAppPhone } from "@/lib/phone";
import { formatTaskAssignedDate } from "@/lib/tasks";
import type { TaskStatus } from "@prisma/client";

const ACTIVE_STATUSES: TaskStatus[] = ["PENDING", "IN_PROGRESS"];

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

function dueReminderLabel(
  sentAt: Date | null,
  requested: boolean,
  task: TaskRow,
) {
  if (!requested) {
    return { label: "Off", tone: "muted" as const };
  }
  if (sentAt) {
    return {
      label: `Sent ${formatTaskAssignedDate(sentAt)}`,
      tone: "sent" as const,
    };
  }
  const isDue = task.dueAt.getTime() <= Date.now();
  if (ACTIVE_STATUSES.includes(task.status) && isDue) {
    return { label: "Due — pending send", tone: "failed" as const };
  }
  if (ACTIVE_STATUSES.includes(task.status)) {
    return { label: "Scheduled at due time", tone: "muted" as const };
  }
  return { label: "Not sent", tone: "muted" as const };
}

export function TaskReminderStatus({
  task,
  showResend = false,
  whatsappConfigured = true,
}: {
  task: TaskRow;
  showResend?: boolean;
  whatsappConfigured?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const assigneePhone =
    "phone" in task.assignee ? task.assignee.phone : null;

  const assignmentEmail = reminderSentLabel(
    task.emailAssignmentSentAt,
    task.remindViaEmail,
  );
  const assignmentWhatsApp = reminderSentLabel(
    task.whatsappAssignmentSentAt,
    task.remindViaWhatsApp,
  );
  const dueEmail = dueReminderLabel(
    task.emailReminderSentAt,
    task.remindViaEmail,
    task,
  );
  const dueWhatsApp = dueReminderLabel(
    task.whatsappReminderSentAt,
    task.remindViaWhatsApp,
    task,
  );

  const assignmentFailed =
    (task.remindViaEmail && !task.emailAssignmentSentAt) ||
    (task.remindViaWhatsApp && !task.whatsappAssignmentSentAt);

  const assignmentWhatsappError =
    task.whatsappAssignmentError?.trim() ||
    (task.remindViaWhatsApp &&
    !task.whatsappAssignmentSentAt &&
    assigneePhone &&
    whatsappConfigured
      ? "Delivery failed. Check API key and active Cloud Phone ID in AI Settings."
      : null);

  const dueFailed =
    ACTIVE_STATUSES.includes(task.status) &&
    task.dueAt.getTime() <= Date.now() &&
    ((task.remindViaEmail && !task.emailReminderSentAt) ||
      (task.remindViaWhatsApp && !task.whatsappReminderSentAt));

  function resendAssignment() {
    startTransition(async () => {
      const result = await resendTaskAssignmentReminders(task.id);
      setFeedback(result.message);
    });
  }

  function resendDue() {
    startTransition(async () => {
      const result = await resendTaskDueReminders(task.id);
      setFeedback(result.message);
    });
  }

  return (
    <section
      aria-label="Task notifications"
      className={`ws-task-reminder-status${pending ? " is-loading" : ""}`}
    >
      <div className="ws-task-reminder-status-head">
        <h4>Notifications</h4>
        {showResend && assignmentFailed ? (
          <button
            className="ws-task-reminder-resend"
            disabled={pending}
            type="button"
            onClick={resendAssignment}
          >
            <RefreshCw aria-hidden size={14} />
            Resend assign
          </button>
        ) : null}
        {showResend && dueFailed ? (
          <button
            className="ws-task-reminder-resend"
            disabled={pending}
            type="button"
            onClick={resendDue}
          >
            <Bell aria-hidden size={14} />
            Resend due
          </button>
        ) : null}
      </div>

      <p className="ws-task-reminder-section-label">On assign</p>
      <dl className="ws-task-reminder-status-grid">
        <div className="ws-task-reminder-status-item">
          <dt>
            <Mail aria-hidden size={14} />
            Email
          </dt>
          <dd>
            <span className={`ws-task-reminder-pill tone-${assignmentEmail.tone}`}>
              {assignmentEmail.label}
            </span>
          </dd>
        </div>

        <div className="ws-task-reminder-status-item">
          <dt>
            <MessageCircle aria-hidden size={14} />
            WhatsApp
          </dt>
          <dd>
            <span
              className={`ws-task-reminder-pill tone-${assignmentWhatsApp.tone}`}
            >
              {assignmentWhatsApp.label}
            </span>
            {task.remindViaWhatsApp ? (
              <span className="ws-task-reminder-hint">
                <Phone aria-hidden size={12} />
                {assigneePhone
                  ? formatWhatsAppPhone(assigneePhone)
                  : "No WhatsApp number on assignee"}
              </span>
            ) : null}
            {task.remindViaWhatsApp &&
            !task.whatsappAssignmentSentAt &&
            assigneePhone ? (
              <>
                <span className="ws-task-reminder-hint">
                  Template: <strong>assign_task_new</strong> (en)
                </span>
                {!whatsappConfigured ? (
                  <span className="ws-task-reminder-hint ws-task-reminder-hint-warn">
                    WhatsApp not connected.{" "}
                    <Link href="/ai/app/settings">Connect in AI Settings</Link>
                  </span>
                ) : assignmentWhatsappError ? (
                  <span className="ws-task-reminder-hint ws-task-reminder-hint-warn">
                    {assignmentWhatsappError}{" "}
                    <Link href="/ai/app/settings">AI Settings</Link>
                    {" · "}
                    <a
                      href="https://wa.sheetomatic.com/ConnectedAccount"
                      rel="noreferrer"
                      target="_blank"
                    >
                      wa.sheetomatic.com
                    </a>
                  </span>
                ) : null}
              </>
            ) : null}
          </dd>
        </div>
      </dl>

      <p className="ws-task-reminder-section-label">At due time</p>
      <dl className="ws-task-reminder-status-grid">
        <div className="ws-task-reminder-status-item">
          <dt>
            <Mail aria-hidden size={14} />
            Email
          </dt>
          <dd>
            <span className={`ws-task-reminder-pill tone-${dueEmail.tone}`}>
              {dueEmail.label}
            </span>
          </dd>
        </div>

        <div className="ws-task-reminder-status-item">
          <dt>
            <MessageCircle aria-hidden size={14} />
            WhatsApp
          </dt>
          <dd>
            <span className={`ws-task-reminder-pill tone-${dueWhatsApp.tone}`}>
              {dueWhatsApp.label}
            </span>
            {task.remindViaWhatsApp &&
            dueWhatsApp.tone === "failed" &&
            whatsappConfigured ? (
              <span className="ws-task-reminder-hint ws-task-reminder-hint-warn">
                Due reminders need an active WhatsApp chat or a recent reply
                from the assignee.
              </span>
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
