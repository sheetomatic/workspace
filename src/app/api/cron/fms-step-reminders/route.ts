import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseAlertConfig } from "@/lib/fms/constants";
import {
  addLocalDays,
  dispatchFmsStepReminder,
  isSameLocalDay,
  startOfLocalDay,
} from "@/lib/fms-reminders";
import { SCALE } from "@/lib/scale";

type ReminderUpdate = {
  whatsappDueSoonSentAt?: Date;
  whatsappSameDaySentAt?: Date;
  whatsappOverdueSentAt?: Date;
};

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
  const todayStart = startOfLocalDay(now);
  let processed = 0;
  let sent = 0;
  let batches = 0;

  while (batches < SCALE.CRON_REMINDER_MAX_BATCHES) {
    const steps = await prisma.fmsStepState.findMany({
      where: {
        status: "IN_PROGRESS",
        plannedAt: { not: null },
        ownerUserId: { not: null },
        instance: { status: "ACTIVE" },
        OR: [
          { whatsappDueSoonSentAt: null },
          { whatsappSameDaySentAt: null },
          { whatsappOverdueSentAt: null },
        ],
      },
      include: {
        step: true,
        owner: { select: { name: true, email: true, phone: true } },
        instance: {
          include: {
            template: { select: { alertConfig: true, name: true } },
            organization: { select: { name: true } },
          },
        },
      },
      take: SCALE.CRON_REMINDER_BATCH,
    });

    if (steps.length === 0) {
      break;
    }

    batches += 1;
    processed += steps.length;

    for (const stepState of steps) {
      if (!stepState.plannedAt || !stepState.owner) {
        continue;
      }

      const config = parseAlertConfig(stepState.instance.template.alertConfig);
      if (!config.whatsappEnabled && !config.emailEnabled) {
        continue;
      }

      const plannedAt = stepState.plannedAt;
      const plannedDayStart = startOfLocalDay(plannedAt);
      const update: ReminderUpdate = {};
      let anySent = false;

      const referenceLabel =
        stepState.instance.referenceLabel ??
        stepState.instance.template.name;

      const baseParams = {
        stepStateId: stepState.id,
        instanceId: stepState.instanceId,
        referenceLabel,
        stepName: stepState.step.stepName,
        plannedAt,
        assignee: stepState.owner,
        organizationName: stepState.instance.organization.name,
        organizationId: stepState.instance.organizationId,
        alertConfig: config,
      };

      if (
        config.onDueComing &&
        !stepState.whatsappDueSoonSentAt &&
        config.dueComingDaysBefore > 0
      ) {
        const dueSoonStart = addLocalDays(
          plannedDayStart,
          -config.dueComingDaysBefore,
        );
        if (now >= dueSoonStart && now < plannedDayStart) {
          const result = await dispatchFmsStepReminder({
            ...baseParams,
            kind: "due_coming",
            dueComingDaysBefore: config.dueComingDaysBefore,
          });
          if (result.whatsappSent || result.emailSent) {
            update.whatsappDueSoonSentAt = new Date();
            anySent = true;
          }
        }
      }

      if (
        config.onSameDay &&
        !stepState.whatsappSameDaySentAt &&
        isSameLocalDay(now, plannedAt) &&
        now < plannedAt
      ) {
        const result = await dispatchFmsStepReminder({
          ...baseParams,
          kind: "same_day",
        });
        if (result.whatsappSent || result.emailSent) {
          update.whatsappSameDaySentAt = new Date();
          anySent = true;
        }
      }

      if (
        config.onOverdue &&
        !stepState.whatsappOverdueSentAt &&
        now > plannedAt
      ) {
        const result = await dispatchFmsStepReminder({
          ...baseParams,
          kind: "overdue",
        });
        if (result.whatsappSent || result.emailSent) {
          update.whatsappOverdueSentAt = new Date();
          anySent = true;
        }
      }

      if (Object.keys(update).length > 0) {
        await prisma.fmsStepState.update({
          where: { id: stepState.id },
          data: update,
        });
        if (anySent) {
          sent += 1;
        }
      }
    }
  }

  return NextResponse.json({ processed, sent, batches });
}
