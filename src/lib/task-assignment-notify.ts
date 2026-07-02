import type { TaskFrequency, TaskPriority } from "@prisma/client";
import {
  dispatchTaskReminders,
  type TaskReminderDispatchResult,
} from "@/lib/task-reminders";
import { getWorkspaceIntegrationStatus } from "@/lib/workspace-integration-status";

type AssigneeContact = {
  name: string | null;
  email: string;
  phone: string | null;
};

export async function resolveAssignmentReminderFlags(
  organizationId: string,
  formData: FormData,
) {
  const integration = await getWorkspaceIntegrationStatus(organizationId);
  const remindViaEmail =
    integration.emailConfigured && formData.get("remindViaEmail") === "1";

  // Always notify on assign when wa.sheetomatic.com is connected for this workspace.
  // Client checkbox only opts out via waOptOut=1 (avoids hidden-field false negatives).
  const remindViaWhatsApp =
    integration.whatsappConfigured && formData.get("waOptOut") !== "1";

  return {
    remindViaEmail,
    remindViaWhatsApp,
    integration,
  };
}

export async function notifyTaskAssignee(params: {
  taskId: string;
  taskTitle: string;
  taskDescription?: string | null;
  priority: TaskPriority;
  dueAt: Date;
  frequency: TaskFrequency;
  isRecurring: boolean;
  assignee: AssigneeContact;
  organizationId: string;
  organizationName: string;
  remindViaEmail: boolean;
  remindViaWhatsApp: boolean;
}): Promise<TaskReminderDispatchResult> {
  if (!params.remindViaEmail && !params.remindViaWhatsApp) {
    return {
      emailSent: false,
      whatsappSent: false,
      summary: "",
      whatsappDetail: undefined,
      emailDetail: undefined,
    };
  }

  return dispatchTaskReminders({
    taskId: params.taskId,
    taskTitle: params.taskTitle,
    taskDescription: params.taskDescription,
    priority: params.priority,
    dueAt: params.dueAt,
    frequency: params.frequency,
    isRecurring: params.isRecurring,
    assignee: params.assignee,
    organizationName: params.organizationName,
    organizationId: params.organizationId,
    remindViaEmail: params.remindViaEmail,
    remindViaWhatsApp: params.remindViaWhatsApp,
  });
}
