/**
 * One-off: verify nurture config and run queues for an org.
 * Usage: npx tsx scripts/run-leads-nurture-queue.ts [orgIdOrSlug]
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";

function loadEnvFiles() {
  for (const file of [".env.local", ".env"]) {
    const filePath = join(process.cwd(), file);
    if (!existsSync(filePath)) {
      continue;
    }
    for (const line of readFileSync(filePath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const eq = trimmed.indexOf("=");
      if (eq <= 0) {
        continue;
      }
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] == null) {
        process.env[key] = value;
      }
    }
  }
}

loadEnvFiles();

import { prisma } from "../src/lib/db";
import { listCrmAlertCenterItems } from "../src/lib/leads/alerts/evaluate";
import { runLeadAlertQueue } from "../src/lib/leads/alerts/run";
import { getLeadNurtureConfig } from "../src/lib/leads/nurture/config";
import { runLeadNurtureQueue } from "../src/lib/leads/nurture/run";
import { isLeadNurtureSendingEnabled } from "../src/lib/leads/nurture/sending-enabled";
import { resolveWorkspaceWhatsAppCredentials } from "../src/lib/whatsapp-settings";
import { masCredentialsFromWorkspace } from "../src/lib/integrations/whatsapp-provider";
import { isMasConfigured } from "../src/lib/integrations/messageautosender";

const ORG_ID_OR_SLUG = process.argv[2] ?? "sheetomatic-technologies";

async function main() {
  const org = await prisma.organization.findFirst({
    where: {
      OR: [{ id: ORG_ID_OR_SLUG }, { slug: ORG_ID_OR_SLUG }],
    },
    select: { id: true, slug: true, name: true },
  });

  if (!org) {
    console.error("Org not found:", ORG_ID_OR_SLUG);
    process.exit(1);
  }

  const [config, credentials, sendingEnabled] = await Promise.all([
    getLeadNurtureConfig(org.id),
    resolveWorkspaceWhatsAppCredentials(org.id),
    isLeadNurtureSendingEnabled(org.id),
  ]);

  const mas = masCredentialsFromWorkspace(credentials);

  console.log("=== Org ===");
  console.log(org);
  console.log("\n=== Nurture config ===");
  console.log(JSON.stringify(config, null, 2));
  console.log("\n=== Sending enabled ===", sendingEnabled);
  console.log("MAS configured:", isMasConfigured(mas));
  console.log("WA provider:", credentials?.whatsappProvider ?? "none");
  if (mas?.phoneNumber) {
    console.log("MAS number:", mas.phoneNumber);
  }

  const alertsBefore = await listCrmAlertCenterItems(org.id, { config });
  const dueBefore = alertsBefore.filter((a) => !a.alreadyMessaged);
  console.log("\n=== Alert inventory (before) ===");
  console.log(`Total: ${alertsBefore.length}, due to send: ${dueBefore.length}`);
  for (const item of dueBefore.slice(0, 15)) {
    console.log(
      `- ${item.kind} | ${item.leadName ?? "unnamed"} | ${item.daysOverdue}d | ${item.reason}`,
    );
  }

  console.log("\n=== Running queues ===");
  const welcomeSent = await runLeadNurtureQueue(org.id);
  const alertResult = await runLeadAlertQueue(org.id);
  console.log("Welcome retries sent:", welcomeSent);
  console.log("Alerts scanned/sent:", alertResult);

  const alertsAfter = await listCrmAlertCenterItems(org.id, { config });
  const dueAfter = alertsAfter.filter((a) => !a.alreadyMessaged);
  console.log("\n=== Alert inventory (after) ===");
  console.log(`Total: ${alertsAfter.length}, still due: ${dueAfter.length}`);

  const waSettings = await prisma.workspaceWhatsAppSettings.findFirst({
    where: { organizationId: org.id },
    select: {
      whatsappProvider: true,
      businessPhone: true,
      masUsername: true,
    },
  });
  console.log("\n=== WA settings ===");
  console.log(waSettings);

  const statusCounts = await prisma.inboundLead.groupBy({
    by: ["status"],
    where: { organizationId: org.id },
    _count: true,
  });
  console.log("\n=== Lead status counts ===");
  console.log(statusCounts);

  const recentNurture = await prisma.inboundLeadActivity.findMany({
    where: {
      organizationId: org.id,
      type: "WHATSAPP",
      metadata: { path: ["nurtureEvent"], not: null },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      createdAt: true,
      metadata: true,
      lead: { select: { name: true, status: true } },
    },
  });
  console.log("\n=== Recent nurture sends ===");
  for (const row of recentNurture) {
    const meta = row.metadata as { nurtureEvent?: string } | null;
    console.log(
      `- ${row.createdAt.toISOString()} | ${meta?.nurtureEvent ?? "?"} | ${row.lead?.name ?? "lead"} (${row.lead?.status ?? "?"})`,
    );
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
