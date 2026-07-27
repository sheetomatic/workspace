import { prisma } from "@/lib/db";
import { runLeadAlertQueue } from "@/lib/leads/alerts/run";
import { runLeadNurtureQueue } from "@/lib/leads/nurture/run";
import { isLeadNurtureSendingEnabled } from "@/lib/leads/nurture/sending-enabled";

const ORG_BATCH = 40;

/** Hourly/scheduled: welcome retries + due commercial alerts for every nurture-ready org. */
export async function runLeadNurtureCronForAllOrgs() {
  const orgs = await prisma.organization.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, slug: true, name: true },
    take: ORG_BATCH,
    orderBy: { createdAt: "asc" },
  });

  let orgsScanned = 0;
  let orgsEligible = 0;
  let welcomeRetried = 0;
  let alertsScanned = 0;
  let alertsSent = 0;
  const errors: Array<{ organizationId: string; error: string }> = [];

  for (const org of orgs) {
    orgsScanned += 1;
    try {
      const enabled = await isLeadNurtureSendingEnabled(org.id);
      if (!enabled) {
        continue;
      }
      orgsEligible += 1;

      const welcome = await runLeadNurtureQueue(org.id);
      welcomeRetried += welcome;

      const alerts = await runLeadAlertQueue(org.id);
      alertsScanned += alerts.scanned;
      alertsSent += alerts.sent;
    } catch (error) {
      errors.push({
        organizationId: org.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    orgsScanned,
    orgsEligible,
    welcomeRetried,
    alertsScanned,
    alertsSent,
    errors,
  };
}
