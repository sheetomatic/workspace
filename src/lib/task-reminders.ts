import type { TaskFrequency, TaskPriority } from "@prisma/client";
import { sendTaskAssignmentEmail } from "@/lib/integrations/email";
import { sendTaskAssignmentWhatsApp } from "@/lib/integrations/whatsapp";
import { TASK_FREQUENCY_LABELS } from "@/lib/task-schedule";
import { buildAssignSuccessMessage } from "@/lib/task-assign-feedback";
import { formatTaskDue } from "@/lib/tasks";

type Assignee = {
  name: string | null;
  email: string;
  phone: string | null;
};

export async function dispatchTaskReminders(params: {
  taskTitle: string;
  priority: TaskPriority;
  dueAt: Date;
  frequency: TaskFrequency;
  isRecurring: boolean;
  assignee: Assignee;
  organizationName: string;
  organizationId: string;
  remindViaEmail: boolean;
  remindViaWhatsApp: boolean;
}) {
  const assigneeName =
    params.assignee.name ?? params.assignee.email.split("@")[0];
  const dueLabel = formatTaskDue(params.dueAt);
  const frequencyLabel = TASK_FREQUENCY_LABELS[params.frequency];

  const parts: string[] = [];
  let emailSent = false;
  let whatsappSent = false;

  if (params.remindViaEmail) {
    const email = await sendTaskAssignmentEmail({
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
      parts.push("email failed");
    }
  }

  if (params.remindViaWhatsApp) {
    const phone =
      params.assignee.phone?.trim() ||
      process.env.WHATSAPP_FALLBACK_PHONE?.trim() ||
      "";
    if (!phone) {
      parts.push("WhatsApp: no phone");
    } else {
      const wa = await sendTaskAssignmentWhatsApp({
        toPhone: phone,
        taskTitle: params.taskTitle,
        assigneeName,
        priority: params.priority,
        dueAt: params.dueAt,
        organizationName: params.organizationName,
        organizationId: params.organizationId,
        frequencyLabel,
        isRecurring: params.isRecurring,
      });
      if (wa.sent) {
        whatsappSent = true;
        parts.push("WhatsApp");
      } else if (wa.reason === "phone_id_required") {
        parts.push("WA not configured");
      } else if (wa.reason === "not_configured") {
        parts.push("WhatsApp not configured");
      } else {
        parts.push("WhatsApp failed");
      }
    }
  }

  return {
    emailSent,
    whatsappSent,
    summary: parts.length ? parts.join(", ") : "",
  };
}

export function formatReminderSuccessMessage(
  base: string,
  reminderSummary: string,
) {
  return buildAssignSuccessMessage(base, reminderSummary);
}
