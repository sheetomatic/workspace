import type { TaskFrequency, TaskPriority } from "@prisma/client";
import {
  sendTaskAssignmentEmail,
  sendTaskDueReminderEmail,
} from "@/lib/integrations/email";
import { sendTaskAssignmentWhatsApp } from "@/lib/integrations/whatsapp";
import { TASK_FREQUENCY_LABELS } from "@/lib/task-schedule";
import { buildAssignSuccessMessage } from "@/lib/task-assign-feedback";
import { formatTaskDue, resolveTaskDescription } from "@/lib/tasks";

type Assignee = {
  name: string | null;
  email: string;
  phone: string | null;
};

export type TaskReminderKind = "assignment" | "due";

export async function dispatchTaskReminders(params: {
  taskId: string;
  taskTitle: string;
  taskDescription?: string | null;
  priority: TaskPriority;
  dueAt: Date;
  frequency: TaskFrequency;
  isRecurring: boolean;
  assignee: Assignee;
  organizationName: string;
  organizationId: string;
  remindViaEmail: boolean;
  remindViaWhatsApp: boolean;
  kind?: TaskReminderKind;
}) {
  const kind = params.kind ?? "assignment";
  const assigneeName =
    params.assignee.name ?? params.assignee.email.split("@")[0];
  const dueLabel = formatTaskDue(params.dueAt);
  const frequencyLabel = TASK_FREQUENCY_LABELS[params.frequency];
  const taskDescription = resolveTaskDescription(
    params.taskTitle,
    params.taskDescription,
  );

  const parts: string[] = [];
  let emailSent = false;
  let whatsappSent = false;
  let whatsappDetail: string | undefined;
  let emailDetail: string | undefined;

  if (params.remindViaEmail) {
    const email =
      kind === "due"
        ? await sendTaskDueReminderEmail({
            toEmail: params.assignee.email,
            assigneeName,
            taskTitle: params.taskTitle,
            organizationName: params.organizationName,
            priority: params.priority,
            dueLabel,
          })
        : await sendTaskAssignmentEmail({
            toEmail: params.assignee.email,
            assigneeName,
            taskTitle: params.taskTitle,
            organizationName: params.organizationName,
            priority: params.priority,
            dueLabel,
            frequencyLabel,
            isRecurring: params.isRecurring,
          });
    if (email.sent) {
      emailSent = true;
      parts.push("email");
    } else if (email.reason === "not_configured") {
      parts.push("email not configured");
    } else {
      emailDetail = email.detail;
      parts.push(email.detail ? `email failed: ${email.detail.slice(0, 160)}` : "email failed");
    }
  }

  if (params.remindViaWhatsApp) {
    const phone = params.assignee.phone?.trim() || "";
    if (!phone) {
      parts.push("WhatsApp: no phone");
    } else {
      const wa = await sendTaskAssignmentWhatsApp({
        toPhone: phone,
        taskId: params.taskId,
        taskTitle: params.taskTitle,
        taskDescription,
        assigneeName,
        priority: params.priority,
        dueAt: params.dueAt,
        organizationName: params.organizationName,
        organizationId: params.organizationId,
        frequencyLabel,
        isRecurring: params.isRecurring,
        reminderKind: kind,
      });
      if (wa.sent) {
        whatsappSent = true;
        parts.push("WhatsApp");
      } else if (wa.reason === "phone_id_required") {
        parts.push("WA not configured");
        whatsappDetail =
          wa.detail ??
          "Phone ID missing — add the active Cloud Phone ID from wa.sheetomatic.com in AI Settings.";
        console.error("[task-reminders] WhatsApp phone_id_required", wa.detail);
      } else if (wa.reason === "not_configured") {
        parts.push("WhatsApp not configured");
      } else if (wa.reason === "invalid_phone") {
        parts.push("WhatsApp invalid phone");
      } else if (wa.reason === "session_required") {
        parts.push(
          kind === "due"
            ? "WhatsApp due reminder needs an active chat session"
            : "WhatsApp session required",
        );
        console.error("[task-reminders] WhatsApp session/template required", wa.detail);
      } else {
        whatsappDetail = wa.detail;
        parts.push(
          wa.detail
            ? `WhatsApp failed: ${wa.detail.slice(0, 160)}`
            : "WhatsApp failed",
        );
        console.error(
          "[task-reminders] WhatsApp send failed",
          wa.reason,
          wa.detail,
          { taskId: params.taskId, phone, kind },
        );
      }
    }
  }

  return {
    emailSent,
    whatsappSent,
    summary: parts.length ? parts.join(", ") : "",
    whatsappDetail,
    emailDetail,
  };
}

export function formatReminderSuccessMessage(
  base: string,
  reminderSummary: string,
) {
  return buildAssignSuccessMessage(base, reminderSummary);
}
