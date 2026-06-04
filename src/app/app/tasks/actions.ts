"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TaskDepartment, TaskPriority } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  alignDueAtForRecurrence,
  computeNextDueAt,
  isRecurringFrequency,
  parseMonthDayFromForm,
  parseWeeklyDaysFromForm,
  resolveFrequencyFromForm,
  serializeWeeklyDays,
} from "@/lib/task-schedule";
import {
  dispatchTaskReminders,
  formatReminderSuccessMessage,
} from "@/lib/task-reminders";
import type { TaskActionState } from "@/lib/task-action-state";
import { isNextRedirect } from "@/lib/next-redirect";
import { isTaskActiveStatus } from "@/lib/task-due-urgency";
import {
  canCreateTasks,
  canUpdateTask,
} from "@/lib/tasks";

export async function createDelegatedTask(
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  try {
    return await createDelegatedTaskInner(formData);
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }
    console.error("createDelegatedTask", error);
    const detail =
      error instanceof Error && process.env.NODE_ENV === "development"
        ? error.message
        : null;
    return {
      ok: false,
      message: detail ?? "Could not assign task. Please try again.",
    };
  }
}

async function createDelegatedTaskInner(
  formData: FormData,
): Promise<TaskActionState> {
  const user = await getSessionUser();
  if (!user || !canCreateTasks(user.role)) {
    return { ok: false, message: "You cannot create tasks." };
  }

  const title = formData.get("title")?.toString().trim() ?? "";
  const instructions = formData.get("instructions")?.toString().trim() ?? "";
  const assigneeUserIds = [
    ...new Set(
      formData
        .getAll("assigneeUserIds")
        .map((value) => value.toString())
        .filter(Boolean),
    ),
  ];
  const legacyAssignee = formData.get("assigneeUserId")?.toString() ?? "";
  if (assigneeUserIds.length === 0 && legacyAssignee) {
    assigneeUserIds.push(legacyAssignee);
  }
  const priority = (formData.get("priority")?.toString() ?? "MEDIUM") as TaskPriority;
  const department = (formData.get("department")?.toString() ??
    "GENERAL") as TaskDepartment;
  const category = formData.get("category")?.toString().trim() || null;
  const dueAtRaw = formData.get("dueAt")?.toString() ?? "";
  const frequency = resolveFrequencyFromForm(
    formData.get("frequency")?.toString() ?? "ONCE",
  );
  const isRecurring =
    formData.get("isRecurring") === "1" || isRecurringFrequency(frequency);
  const remindViaEmail = formData.get("remindViaEmail") === "1";
  const remindViaWhatsApp = formData.get("remindViaWhatsApp") === "1";

  if (title.length < 3) {
    return { ok: false, message: "Task title is required." };
  }

  if (category && category.length > 80) {
    return { ok: false, message: "Category must be 80 characters or less." };
  }

  if (assigneeUserIds.length === 0) {
    return { ok: false, message: "Select at least one assignee." };
  }

  let dueAt = dueAtRaw ? new Date(dueAtRaw) : defaultDueDate();
  if (Number.isNaN(dueAt.getTime())) {
    return { ok: false, message: "Invalid due date." };
  }

  const weeklyDays = parseWeeklyDaysFromForm(
    formData.get("recurrenceWeeklyDays")?.toString(),
  );
  const monthDay = parseMonthDayFromForm(
    formData.get("recurrenceMonthDay")?.toString(),
    dueAt,
  );

  if (isRecurring && frequency === "WEEKLY" && weeklyDays.length === 0) {
    return { ok: false, message: "Select at least one day for weekly tasks." };
  }

  const recurrenceOptions = {
    weeklyDays: frequency === "WEEKLY" ? weeklyDays : undefined,
    monthDay: frequency === "MONTHLY" ? monthDay : undefined,
  };

  if (isRecurring) {
    dueAt = alignDueAtForRecurrence(dueAt, frequency, recurrenceOptions);
  }

  const recurrenceWeeklyDays =
    isRecurring && frequency === "WEEKLY"
      ? serializeWeeklyDays(weeklyDays)
      : null;
  const recurrenceMonthDay =
    isRecurring && frequency === "MONTHLY" ? monthDay : null;

  const memberships = await prisma.membership.findMany({
    where: {
      organizationId: user.organizationId,
      userId: { in: assigneeUserIds },
    },
    select: { userId: true },
  });

  if (memberships.length !== assigneeUserIds.length) {
    return { ok: false, message: "All assignees must be in your organization." };
  }

  let message =
    assigneeUserIds.length === 1
      ? isRecurring
        ? "Recurring task assigned."
        : "Task assigned."
      : isRecurring
        ? `Recurring task assigned to ${assigneeUserIds.length} people.`
        : `Task assigned to ${assigneeUserIds.length} people.`;

  for (const assigneeUserId of assigneeUserIds) {
    const seriesId = isRecurring ? randomUUID() : null;
    const nextOccurrenceAt = isRecurring
      ? computeNextDueAt(frequency, dueAt, recurrenceOptions)
      : null;

    const task = await prisma.delegatedTask.create({
      data: {
        organizationId: user.organizationId,
        title,
        instructions: instructions || null,
        assigneeUserId,
        createdById: user.id,
        priority,
        department,
        category,
        frequency,
        recurrenceWeeklyDays,
        recurrenceMonthDay,
        isRecurring,
        seriesId,
        occurrenceNumber: 1,
        nextOccurrenceAt,
        remindViaEmail,
        remindViaWhatsApp,
        dueAt,
        status: "PENDING",
      },
      include: {
        assignee: { select: { name: true, email: true, phone: true } },
      },
    });

    if (remindViaEmail || remindViaWhatsApp) {
      const reminders = await dispatchTaskReminders({
        taskId: task.id,
        taskTitle: title,
        taskDescription: instructions || null,
        priority,
        dueAt,
        frequency,
        isRecurring,
        assignee: task.assignee,
        organizationName: user.organizationName,
        organizationId: user.organizationId,
        remindViaEmail,
        remindViaWhatsApp,
      });

      await prisma.delegatedTask.update({
        where: { id: task.id },
        data: {
          emailAssignmentSentAt: reminders.emailSent ? new Date() : null,
          whatsappAssignmentSentAt: reminders.whatsappSent ? new Date() : null,
        },
      });

      message = formatReminderSuccessMessage(message, reminders.summary);
    }
  }

  revalidatePath("/app");
  revalidatePath("/app/tasks");

  const toast = encodeURIComponent(message);
  redirect(`/app/tasks?assigned=1&toast=${toast}#execution-queue`);
}

export async function updateTaskStatus(
  taskId: string,
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED",
): Promise<TaskActionState> {
  try {
    return await updateTaskStatusInner(taskId, status);
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }
    console.error("updateTaskStatus", error);
    return {
      ok: false,
      message: "Could not update task. Please try again.",
    };
  }
}

async function updateTaskStatusInner(
  taskId: string,
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED",
): Promise<TaskActionState> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, message: "Sign in required." };
  }

  const task = await prisma.delegatedTask.findFirst({
    where: { id: taskId, organizationId: user.organizationId },
    include: {
      assignee: { select: { name: true, email: true, phone: true } },
    },
  });

  if (!task || !canUpdateTask(user, task)) {
    return { ok: false, message: "You cannot update this task." };
  }

  const updated = await prisma.delegatedTask.updateMany({
    where: { id: taskId, organizationId: user.organizationId },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });

  if (updated.count === 0) {
    return { ok: false, message: "Could not update task." };
  }

  let message = "Status updated.";

  if (
    status === "COMPLETED" &&
    task.isRecurring &&
    isRecurringFrequency(task.frequency)
  ) {
    const recurrenceOptions = {
      weeklyDays:
        task.frequency === "WEEKLY"
          ? parseWeeklyDaysFromForm(task.recurrenceWeeklyDays)
          : undefined,
      monthDay:
        task.frequency === "MONTHLY"
          ? (task.recurrenceMonthDay ?? task.dueAt.getDate())
          : undefined,
    };
    const nextDue = computeNextDueAt(
      task.frequency,
      task.dueAt,
      recurrenceOptions,
    );
    if (nextDue) {
      const nextTask = await prisma.delegatedTask.create({
        data: {
          organizationId: task.organizationId,
          title: task.title,
          instructions: task.instructions,
          assigneeUserId: task.assigneeUserId,
          createdById: task.createdById,
          priority: task.priority,
          department: task.department,
          category: task.category,
          frequency: task.frequency,
          recurrenceWeeklyDays: task.recurrenceWeeklyDays,
          recurrenceMonthDay: task.recurrenceMonthDay,
          isRecurring: true,
          seriesId: task.seriesId ?? task.id,
          occurrenceNumber: task.occurrenceNumber + 1,
          nextOccurrenceAt: computeNextDueAt(
            task.frequency,
            nextDue,
            recurrenceOptions,
          ),
          remindViaEmail: task.remindViaEmail,
          remindViaWhatsApp: task.remindViaWhatsApp,
          dueAt: nextDue,
          status: "PENDING",
        },
      });

      if (task.remindViaEmail || task.remindViaWhatsApp) {
        const reminders = await dispatchTaskReminders({
          taskId: nextTask.id,
          taskTitle: task.title,
          taskDescription: task.instructions,
          priority: task.priority,
          dueAt: nextDue,
          frequency: task.frequency,
          isRecurring: true,
          assignee: task.assignee,
          organizationName: user.organizationName,
          organizationId: user.organizationId,
          remindViaEmail: task.remindViaEmail,
          remindViaWhatsApp: task.remindViaWhatsApp,
        });
        await prisma.delegatedTask.update({
          where: { id: nextTask.id },
          data: {
            emailAssignmentSentAt: reminders.emailSent ? new Date() : null,
            whatsappAssignmentSentAt: reminders.whatsappSent ? new Date() : null,
          },
        });
      }

      message = `Marked done. Next ${task.frequency.toLowerCase()} run scheduled.`;
    }
  } else if (status === "COMPLETED") {
    message = "Task marked done.";
  } else if (status === "IN_PROGRESS") {
    message = "Task started.";
  }

  revalidatePath("/app");
  revalidatePath("/app/tasks");

  const toast = encodeURIComponent(message);
  redirect(`/app/tasks?updated=1&toast=${toast}#execution-queue`);
}

function defaultDueDate() {
  const d = new Date();
  d.setHours(17, 0, 0, 0);
  if (d.getTime() < Date.now()) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

export async function updateDelegatedTask(
  taskId: string,
  formData: FormData,
): Promise<TaskActionState> {
  const user = await getSessionUser();
  if (!user || !canCreateTasks(user.role)) {
    return { ok: false, message: "You cannot edit tasks." };
  }

  const task = await prisma.delegatedTask.findFirst({
    where: { id: taskId, organizationId: user.organizationId },
  });

  if (!task) {
    return { ok: false, message: "Task not found." };
  }

  const title = formData.get("title")?.toString().trim() ?? task.title;
  const instructions =
    formData.get("instructions")?.toString().trim() ?? task.instructions ?? "";
  const assigneeRaw = formData.get("assigneeUserId")?.toString().trim() ?? "";
  const assigneeUserId = assigneeRaw || task.assigneeUserId;
  const priority = (formData.get("priority")?.toString() ??
    task.priority) as TaskPriority;
  const department = (formData.get("department")?.toString() ??
    task.department) as TaskDepartment;
  const category =
    formData.get("category")?.toString().trim() || task.category || null;
  const dueAtRaw = formData.get("dueAt")?.toString() ?? "";
  const dueAt = dueAtRaw ? new Date(dueAtRaw) : task.dueAt;
  const statusRaw = formData.get("status")?.toString() ?? task.status;
  const allowedStatuses = [
    "PENDING",
    "IN_PROGRESS",
    "COMPLETED",
    "REVISION_REQUESTED",
    "EXTENSION_REQUESTED",
    "HELP_REQUESTED",
  ] as const;
  if (!allowedStatuses.includes(statusRaw as (typeof allowedStatuses)[number])) {
    return { ok: false, message: "Invalid status." };
  }
  const status = statusRaw as (typeof allowedStatuses)[number];

  if (title.length < 3) {
    return { ok: false, message: "Task title is required." };
  }

  if (Number.isNaN(dueAt.getTime())) {
    return { ok: false, message: "Invalid due date." };
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: assigneeUserId,
        organizationId: user.organizationId,
      },
    },
  });

  if (!membership) {
    return { ok: false, message: "Assignee must be in your organization." };
  }

  const dueAtChanged = dueAt.getTime() !== task.dueAt.getTime();
  const reopeningToActive =
    isTaskActiveStatus(status) && task.status === "COMPLETED";

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.delegatedTask.updateMany({
      where: { id: taskId, organizationId: user.organizationId },
      data: {
        title,
        instructions: instructions || null,
        assigneeUserId,
        priority,
        department,
        category,
        dueAt,
        status,
        completedAt: status === "COMPLETED" ? task.completedAt ?? new Date() : null,
        ...(dueAtChanged
          ? {
              emailReminderSentAt: null,
              whatsappReminderSentAt: null,
            }
          : {}),
      },
    });

    if (result.count > 0 && reopeningToActive) {
      await tx.taskRequest.updateMany({
        where: { taskId, status: "OPEN" },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
          resolvedById: user.id,
          resolutionNote: "Task reopened by manager",
        },
      });
    }

    return result;
  });

  if (updated.count === 0) {
    return { ok: false, message: "Task not found." };
  }

  revalidatePath("/app");
  revalidatePath("/app/tasks");
  return { ok: true, message: "Task updated." };
}

export async function deleteDelegatedTask(
  taskId: string,
): Promise<TaskActionState> {
  const user = await getSessionUser();
  if (!user || !canCreateTasks(user.role)) {
    return { ok: false, message: "You cannot delete tasks." };
  }

  const task = await prisma.delegatedTask.findFirst({
    where: { id: taskId, organizationId: user.organizationId },
  });

  if (!task) {
    return { ok: false, message: "Task not found." };
  }

  const deleted = await prisma.delegatedTask.deleteMany({
    where: { id: taskId, organizationId: user.organizationId },
  });

  if (deleted.count === 0) {
    return { ok: false, message: "Task not found." };
  }

  revalidatePath("/app");
  revalidatePath("/app/tasks");
  return { ok: true, message: "Task deleted." };
}

export async function resendTaskAssignmentReminders(
  taskId: string,
): Promise<TaskActionState> {
  const user = await getSessionUser();
  if (!user || !canCreateTasks(user.role)) {
    return { ok: false, message: "You cannot resend task notifications." };
  }

  const task = await prisma.delegatedTask.findFirst({
    where: { id: taskId, organizationId: user.organizationId },
    include: {
      assignee: { select: { name: true, email: true, phone: true } },
    },
  });

  if (!task) {
    return { ok: false, message: "Task not found." };
  }

  if (!task.remindViaEmail && !task.remindViaWhatsApp) {
    return {
      ok: false,
      message: "This task has no email or WhatsApp reminders enabled.",
    };
  }

  const reminders = await dispatchTaskReminders({
    taskId: task.id,
    taskTitle: task.title,
    taskDescription: task.instructions,
    priority: task.priority,
    dueAt: task.dueAt,
    frequency: task.frequency,
    isRecurring: task.isRecurring,
    assignee: task.assignee,
    organizationName: user.organizationName,
    organizationId: user.organizationId,
    remindViaEmail: task.remindViaEmail,
    remindViaWhatsApp: task.remindViaWhatsApp,
  });

  await prisma.delegatedTask.update({
    where: { id: task.id },
    data: {
      emailAssignmentSentAt: reminders.emailSent
        ? new Date()
        : task.emailAssignmentSentAt,
      whatsappAssignmentSentAt: reminders.whatsappSent
        ? new Date()
        : task.whatsappAssignmentSentAt,
    },
  });

  revalidatePath("/app/tasks");

  const base = "Notification resend attempted.";
  return {
    ok: reminders.emailSent || reminders.whatsappSent,
    message: formatReminderSuccessMessage(base, reminders.summary),
  };
}
