import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SCALE } from "@/lib/scale";
import { dispatchTaskReminders } from "@/lib/task-reminders";
import { ACTIVE_TASK_STATUSES } from "@/lib/tasks";
import {
  ANMOL_TRADERS_SLUG,
  getOrgTaskPolicy,
  shouldSendIntervalReminder,
} from "@/lib/tasks/org-task-policy";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "production" && !cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET required" }, { status: 503 });
  }

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const intervalCutoff = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const seenIds: string[] = [];
  let processed = 0;
  let sent = 0;
  let batches = 0;

  while (batches < SCALE.CRON_REMINDER_MAX_BATCHES) {
    const dueTasks = await prisma.delegatedTask.findMany({
      where: {
        id: seenIds.length > 0 ? { notIn: seenIds } : undefined,
        status: { in: ACTIVE_TASK_STATUSES },
        dueAt: { lte: now },
        OR: [
          {
            remindViaEmail: true,
            emailReminderSentAt: null,
          },
          {
            remindViaWhatsApp: true,
            whatsappReminderSentAt: null,
          },
          {
            remindViaWhatsApp: true,
            whatsappReminderSentAt: { lte: intervalCutoff },
            organization: { slug: ANMOL_TRADERS_SLUG },
          },
        ],
      },
      include: {
        assignee: { select: { name: true, email: true, phone: true } },
        organization: { select: { name: true, slug: true } },
      },
      take: SCALE.CRON_REMINDER_BATCH,
    });

    if (dueTasks.length === 0) {
      break;
    }

    batches += 1;
    processed += dueTasks.length;

    for (const task of dueTasks) {
      seenIds.push(task.id);
      const policy = getOrgTaskPolicy(task.organization.slug);
      const needsFirstEmail = task.remindViaEmail && !task.emailReminderSentAt;
      const needsFirstWhatsApp =
        task.remindViaWhatsApp && !task.whatsappReminderSentAt;
      const needsInterval =
        task.remindViaWhatsApp &&
        shouldSendIntervalReminder({
          slug: task.organization.slug,
          now,
          dueAt: task.dueAt,
          lastWhatsAppReminderAt: task.whatsappReminderSentAt,
        });

      if (!needsFirstEmail && !needsFirstWhatsApp && !needsInterval) {
        continue;
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
        organizationName: task.organization.name,
        organizationId: task.organizationId,
        remindViaEmail: needsFirstEmail,
        remindViaWhatsApp: needsFirstWhatsApp || needsInterval,
        kind: needsInterval && !needsFirstWhatsApp ? "interval" : "due",
        whatsappOnly: policy.whatsappOnlyTeam,
      });

      if (reminders.emailSent || reminders.whatsappSent) {
        sent += 1;
        await prisma.delegatedTask.update({
          where: { id: task.id },
          data: {
            emailReminderSentAt: reminders.emailSent
              ? new Date()
              : task.emailReminderSentAt,
            whatsappReminderSentAt: reminders.whatsappSent
              ? new Date()
              : task.whatsappReminderSentAt,
          },
        });
      }
    }
  }

  return NextResponse.json({ processed, sent, batches });
}
