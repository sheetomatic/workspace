import type { TaskReminderDispatchResult } from "@/lib/task-reminders";
import { humanizeReminderSummary } from "@/lib/task-assign-feedback";

type ReminderResult = TaskReminderDispatchResult;

function assignmentWhatsappError(
  reminders: ReminderResult,
  remindViaWhatsApp: boolean,
  assigneeHasPhone: boolean,
): string | null {
  if (!remindViaWhatsApp || !assigneeHasPhone || reminders.whatsappSent) {
    return null;
  }
  if (reminders.whatsappDetail?.trim()) {
    return reminders.whatsappDetail.trim().slice(0, 900);
  }
  const human = humanizeReminderSummary(reminders.summary);
  return human || "WhatsApp assignment message could not be sent.";
}

export function buildAssignmentReminderUpdate(
  reminders: ReminderResult,
  params: {
    remindViaWhatsApp: boolean;
    assigneeHasPhone: boolean;
    previousWhatsappSentAt?: Date | null;
  },
) {
  const error = assignmentWhatsappError(
    reminders,
    params.remindViaWhatsApp,
    params.assigneeHasPhone,
  );

  return {
    emailAssignmentSentAt: reminders.emailSent ? new Date() : null,
    whatsappAssignmentSentAt: reminders.whatsappSent
      ? new Date()
      : params.previousWhatsappSentAt ?? null,
    whatsappAssignmentError: reminders.whatsappSent ? null : error,
  };
}

export function buildResendAssignmentReminderUpdate(
  reminders: ReminderResult,
  params: {
    remindViaWhatsApp: boolean;
    assigneeHasPhone: boolean;
    previousWhatsappSentAt: Date | null;
    previousEmailSentAt: Date | null;
  },
) {
  const error = assignmentWhatsappError(
    reminders,
    params.remindViaWhatsApp,
    params.assigneeHasPhone,
  );

  return {
    emailAssignmentSentAt: reminders.emailSent
      ? new Date()
      : params.previousEmailSentAt,
    whatsappAssignmentSentAt: reminders.whatsappSent
      ? new Date()
      : params.previousWhatsappSentAt,
    whatsappAssignmentError: reminders.whatsappSent ? null : error,
  };
}
