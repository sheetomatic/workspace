import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseAlertConfig } from "@/lib/fms/constants";
import {
  addLocalDays,
  dispatchFmsStepReminder,
  isSameLocalDay,
  startOfLocalDay,
  type FmsReminderKind,
} from "@/lib/fms-reminders";
import { SCALE } from "@/lib/scale";
import {
  claimFmsReminder,
  FMS_REMINDER_CLAIM_FIELD,
  releaseFmsReminder,
} from "@/lib/fms/reminder-claim";

type ReminderKind = Exclude<FmsReminderKind, "assign">;

async function dispatchClaimedReminder(params: {
  kind: ReminderKind;
  stepStateId: string;
  baseParams: Omit<
    Parameters<typeof dispatchFmsStepReminder>[0],
    "kind"
  >;
}) {
  const field = FMS_REMINDER_CLAIM_FIELD[params.kind];
  const claimed = await claimFmsReminder(params.stepStateId, field);
  if (!claimed) {
    return false;
  }

  const result = await dispatchFmsStepReminder({
    ...params.baseParams,
    kind: params.kind,
  });
  if (result.whatsappSent || result.emailSent) {
    return true;
  }

  await releaseFmsReminder(params.stepStateId, field);
  return false;
}

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

  try {
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
          const didSend = await dispatchClaimedReminder({
            kind: "due_coming",
            stepStateId: stepState.id,
            baseParams: {
              ...baseParams,
              dueComingDaysBefore: config.dueComingDaysBefore,
            },
          });
          if (didSend) {
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
        const didSend = await dispatchClaimedReminder({
          kind: "same_day",
          stepStateId: stepState.id,
          baseParams,
        });
        if (didSend) {
          anySent = true;
        }
      }

      if (
        config.onOverdue &&
        !stepState.whatsappOverdueSentAt &&
        now > plannedAt
      ) {
        const didSend = await dispatchClaimedReminder({
          kind: "overdue",
          stepStateId: stepState.id,
          baseParams,
        });
        if (didSend) {
          anySent = true;
        }
      }

      if (anySent) {
        sent += 1;
      }
    }
  }

    const summary = `processed=${processed} sent=${sent} batches=${batches}`;
    await recordCronHeartbeat(summary, true);
    return NextResponse.json({ processed, sent, batches });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron failed";
    await recordCronHeartbeat(message, false);
    throw error;
  }
}

async function recordCronHeartbeat(summary: string, ok: boolean) {
  await prisma.cronHeartbeat.upsert({
    where: { jobKey: "fms-step-reminders" },
    create: {
      jobKey: "fms-step-reminders",
      lastRunAt: new Date(),
      lastOk: ok,
      summary,
    },
    update: {
      lastRunAt: new Date(),
      lastOk: ok,
      summary,
    },
  });
}
