import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SCALE } from "@/lib/scale";
import { dispatchTaskReminders } from "@/lib/task-reminders";
import { ACTIVE_TASK_STATUSES } from "@/lib/tasks";
import {
  ANMOL_TRADERS_SLUG,
  getOrgTaskPolicy,
  lastTaskWhatsAppAt,
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
  const anmolGapMinutes =
    getOrgTaskPolicy(ANMOL_TRADERS_SLUG).intervalReminderMinutes ?? 90;
  const intervalCutoff = new Date(now.getTime() - anmolGapMinutes * 60 * 1000);
  const seenIds: string[] = [];
  let processed = 0;
  let sent = 0;
  let batches = 0;

  while (batches < SCALE.CRON_REMINDER_MAX_BATCHES) {
    const dueTasks = await prisma.delegatedTask.findMany({
      where: {
        id: seenIds.length > 0 ? { notIn: seenIds } : undefined,
        status: { in: ACTIVE_TASK_STATUSES },
        OR: [
          {
            dueAt: { lte: now },
            remindViaEmail: true,
            emailReminderSentAt: null,
          },
          {
            dueAt: { lte: now },
            remindViaWhatsApp: true,
            whatsappReminderSentAt: null,
          },
          {
            remindViaWhatsApp: true,
            organization: { slug: ANMOL_TRADERS_SLUG },
            OR: [
              { whatsappReminderSentAt: { lte: intervalCutoff } },
              {
                whatsappReminderSentAt: null,
                whatsappAssignmentSentAt: { lte: intervalCutoff },
              },
              {
                whatsappReminderSentAt: null,
                whatsappAssignmentSentAt: null,
                createdAt: { lte: intervalCutoff },
              },
            ],
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
      const isDue = task.dueAt.getTime() <= now.getTime();
      const needsFirstEmail = task.remindViaEmail && !task.emailReminderSentAt && isDue;
      const needsFirstWhatsApp =
        task.remindViaWhatsApp && !task.whatsappReminderSentAt && isDue;
      const needsInterval =
        task.remindViaWhatsApp &&
        shouldSendIntervalReminder({
          slug: task.organization.slug,
          now,
          lastWhatsAppAt: lastTaskWhatsAppAt(task),
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
