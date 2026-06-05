import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SCALE } from "@/lib/scale";
import { dispatchTaskReminders } from "@/lib/task-reminders";
import { ACTIVE_TASK_STATUSES } from "@/lib/tasks";

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
  let processed = 0;
  let sent = 0;
  let batches = 0;

  while (batches < SCALE.CRON_REMINDER_MAX_BATCHES) {
    const dueTasks = await prisma.delegatedTask.findMany({
      where: {
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
        ],
      },
      include: {
        assignee: { select: { name: true, email: true, phone: true } },
        organization: { select: { name: true } },
      },
      take: SCALE.CRON_REMINDER_BATCH,
    });

    if (dueTasks.length === 0) {
      break;
    }

    batches += 1;
    processed += dueTasks.length;

    for (const task of dueTasks) {
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
        remindViaEmail: task.remindViaEmail,
        remindViaWhatsApp: task.remindViaWhatsApp,
        kind: "due",
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
