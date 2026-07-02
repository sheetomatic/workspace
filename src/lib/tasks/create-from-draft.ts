import { randomUUID } from "crypto";
import type { ParsedTaskDraft } from "@/lib/integrations/openai";
import { prisma } from "@/lib/db";
import { dispatchTaskReminders } from "@/lib/task-reminders";
import { buildAssignmentReminderUpdate } from "@/lib/task-reminder-persist";
import {
  alignDueAtForRecurrence,
  computeNextDueAt,
  isRecurringFrequency,
  serializeWeeklyDays,
} from "@/lib/task-schedule";

export type CreateTaskFromDraftResult =
  | {
      ok: true;
      taskId: string;
      title: string;
      assigneeName: string;
      dueAt: Date;
      whatsappSent: boolean;
    }
  | { ok: false; error: string };

export async function createDelegatedTaskFromDraft(params: {
  organizationId: string;
  organizationName: string;
  createdById: string;
  draft: ParsedTaskDraft;
  /** Bot flow defaults to notifying assignee on WhatsApp. */
  notifyAssignee?: boolean;
}): Promise<CreateTaskFromDraftResult> {
  const { draft, organizationId, organizationName, createdById } = params;

  if (!draft.assigneeUserId) {
    const hint = draft.assigneeHint?.trim();
    return {
      ok: false,
      error: hint
        ? `Could not match "${hint}" to a team member. Add their WhatsApp number in Channels settings.`
        : "Could not identify assignee. Say who should do the task.",
    };
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: draft.assigneeUserId,
        organizationId,
      },
    },
    include: {
      user: { select: { name: true, email: true, phone: true } },
    },
  });

  if (!membership) {
    return { ok: false, error: "Assignee is not in this organization." };
  }

  const dueAt = new Date(draft.dueAtIso);
  if (Number.isNaN(dueAt.getTime())) {
    return { ok: false, error: "Could not parse due date from instruction." };
  }

  const frequency = draft.frequency;
  const isRecurring = draft.isRecurring || isRecurringFrequency(frequency);
  const weeklyDays = draft.recurrenceWeeklyDays;
  const monthDay = draft.recurrenceMonthDay;
  const recurrenceOptions = {
    weeklyDays: frequency === "WEEKLY" ? weeklyDays : undefined,
    monthDay: frequency === "MONTHLY" ? (monthDay ?? dueAt.getDate()) : undefined,
  };

  let alignedDueAt = dueAt;
  if (isRecurring) {
    alignedDueAt = alignDueAtForRecurrence(dueAt, frequency, recurrenceOptions);
  }

  const seriesId = isRecurring ? randomUUID() : null;
  const nextOccurrenceAt = isRecurring
    ? computeNextDueAt(frequency, alignedDueAt, recurrenceOptions)
    : null;

  const remindViaWhatsApp =
    params.notifyAssignee !== false ? true : Boolean(draft.remindViaWhatsApp);
  const remindViaEmail = Boolean(draft.remindViaEmail);

  const task = await prisma.delegatedTask.create({
    data: {
      organizationId,
      title: draft.title,
      instructions: draft.instructions || null,
      assigneeUserId: draft.assigneeUserId,
      createdById,
      priority: draft.priority,
      department: draft.department,
      category: draft.category,
      frequency,
      recurrenceWeeklyDays:
        isRecurring && frequency === "WEEKLY"
          ? serializeWeeklyDays(weeklyDays)
          : null,
      recurrenceMonthDay:
        isRecurring && frequency === "MONTHLY" ? monthDay : null,
      isRecurring,
      seriesId,
      occurrenceNumber: 1,
      nextOccurrenceAt,
      remindViaEmail,
      remindViaWhatsApp,
      dueAt: alignedDueAt,
      status: "PENDING",
    },
    include: {
      assignee: { select: { name: true, email: true, phone: true } },
    },
  });

  const assigneeName =
    task.assignee.name ?? task.assignee.email.split("@")[0];

  let whatsappSent = false;

  if (params.notifyAssignee !== false && (remindViaWhatsApp || remindViaEmail)) {
    const reminders = await dispatchTaskReminders({
      taskId: task.id,
      taskTitle: task.title,
      taskDescription: task.instructions,
      priority: task.priority,
      dueAt: alignedDueAt,
      frequency,
      isRecurring,
      assignee: task.assignee,
      organizationName,
      organizationId,
      remindViaEmail,
      remindViaWhatsApp,
    });

    whatsappSent = reminders.whatsappSent;

    await prisma.delegatedTask.update({
      where: { id: task.id },
      data: buildAssignmentReminderUpdate(reminders, {
        remindViaWhatsApp,
        assigneeHasPhone: Boolean(task.assignee.phone?.trim()),
      }),
    });
  }

  return {
    ok: true,
    taskId: task.id,
    title: task.title,
    assigneeName,
    dueAt: alignedDueAt,
    whatsappSent,
  };
}
