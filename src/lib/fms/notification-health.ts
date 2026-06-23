import { prisma } from "@/lib/db";
import { getWhatsAppGoLiveStatus } from "@/lib/whatsapp-go-live";
import { isEmailConfigured } from "@/lib/integrations/email";

export type FmsNotificationHealth = {
  cronSecretConfigured: boolean;
  lastFmsReminderRun: string | null;
  lastFmsReminderOk: boolean | null;
  lastFmsReminderSummary: string | null;
  whatsappReady: boolean;
  whatsappBlockers: string[];
  emailConfigured: boolean;
  unassignedActiveSteps: number;
  inProgressWithoutPhone: number;
};

export async function getFmsNotificationHealth(
  organizationId: string,
): Promise<FmsNotificationHealth> {
  const [heartbeat, goLive, unassignedActiveSteps, stepsWithoutPhone] =
    await Promise.all([
      prisma.cronHeartbeat.findUnique({
        where: { jobKey: "fms-step-reminders" },
      }),
      getWhatsAppGoLiveStatus(organizationId),
      prisma.fmsStepState.count({
        where: {
          status: "IN_PROGRESS",
          ownerUserId: null,
          instance: { organizationId, status: "ACTIVE" },
        },
      }),
      prisma.fmsStepState.count({
        where: {
          status: "IN_PROGRESS",
          ownerUserId: { not: null },
          instance: { organizationId, status: "ACTIVE" },
          owner: { OR: [{ phone: null }, { phone: "" }] },
        },
      }),
    ]);

  return {
    cronSecretConfigured: Boolean(process.env.CRON_SECRET?.trim()),
    lastFmsReminderRun: heartbeat?.lastRunAt.toISOString() ?? null,
    lastFmsReminderOk: heartbeat?.lastOk ?? null,
    lastFmsReminderSummary: heartbeat?.summary ?? null,
    whatsappReady: goLive.credentialsReady && goLive.webhookReceived,
    whatsappBlockers: goLive.blockers.filter(
      (item) =>
        item.includes("webhook") ||
        item.includes("WhatsApp") ||
        item.includes("WHATSAPP") ||
        item.includes("delegator"),
    ),
    emailConfigured: isEmailConfigured(),
    unassignedActiveSteps: unassignedActiveSteps,
    inProgressWithoutPhone: stepsWithoutPhone,
  };
}
