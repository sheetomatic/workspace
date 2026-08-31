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
import {
  endOfIstDay,
  isReminderWindowOpen,
  resolveEffectiveStartAt,
} from "@/lib/task-due-ist";

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
  const dayCutoff = endOfIstDay(now);
  const seenIds: string[] = [];
  let processed = 0;
  let sent = 0;
  let batches = 0;
  let skippedBeforeStart = 0;

  while (batches < SCALE.CRON_REMINDER_MAX_BATCHES) {
    const dueTasks = await prisma.delegatedTask.findMany({
      where: {
        id: seenIds.length > 0 ? { notIn: seenIds } : undefined,
        status: { in: ACTIVE_TASK_STATUSES },
        OR: [
          {
            dueAt: { lte: dayCutoff },
            remindViaEmail: true,
            emailReminderSentAt: null,
          },
          {
            dueAt: { lte: dayCutoff },
            remindViaWhatsApp: true,
            whatsappReminderSentAt: null,
          },
          {
            // Anmol interval pings — only once Start (or due day) is reachable.
            remindViaWhatsApp: true,
            organization: { slug: ANMOL_TRADERS_SLUG },
            OR: [
              { startAt: { lte: dayCutoff } },
              { startAt: null, dueAt: { lte: dayCutoff } },
            ],
            AND: [
              {
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
      const effectiveStartAt = resolveEffectiveStartAt({
        instructions: task.instructions,
        storedStartAt: task.startAt,
      });
      const windowOpen = isReminderWindowOpen(
        task.dueAt,
        now,
        effectiveStartAt,
      );
      if (!windowOpen) {
        skippedBeforeStart += 1;
        // Heal rows stored early: persist labeled Start from instructions.
        if (
          effectiveStartAt &&
          (!task.startAt ||
            task.startAt.getTime() !== effectiveStartAt.getTime())
        ) {
          await prisma.delegatedTask.update({
            where: { id: task.id },
            data: { startAt: effectiveStartAt },
          });
        }
        continue;
      }

      const needsFirstEmail =
        task.remindViaEmail && !task.emailReminderSentAt && windowOpen;
      const needsFirstWhatsApp =
        task.remindViaWhatsApp && !task.whatsappReminderSentAt && windowOpen;
      const needsInterval =
        task.remindViaWhatsApp &&
        shouldSendIntervalReminder({
          slug: task.organization.slug,
          now,
          dueAt: task.dueAt,
          startAt: effectiveStartAt,
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
        startAt: effectiveStartAt,
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
            ...(effectiveStartAt &&
            (!task.startAt ||
              task.startAt.getTime() !== effectiveStartAt.getTime())
              ? { startAt: effectiveStartAt }
              : {}),
          },
        });
      }
    }
  }

  return NextResponse.json({
    processed,
    sent,
    batches,
    skippedBeforeStart,
  });
}
