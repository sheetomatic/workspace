import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runLeadAlertQueue } from "@/lib/leads/alerts/run";
import { runLeadNurtureQueue } from "@/lib/leads/nurture/run";
import { isLeadNurtureSendingEnabled } from "@/lib/leads/nurture/sending-enabled";
import { syncAllEnabledLeadConnections } from "@/lib/leads/sync-sources";

function authorizeCron(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/** Pull leads from configured Meta / Google Sheets APIs for all orgs with enabled connections. */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgs = await prisma.leadIngestConnection.findMany({
    where: { enabled: true, channel: { not: "WHATSAPP" } },
    select: { organizationId: true },
    distinct: ["organizationId"],
  });

  const results = [];
  for (const org of orgs) {
    const synced = await syncAllEnabledLeadConnections(org.organizationId);
    let nurture: { welcome: number; alerts: { scanned: number; sent: number } } | null =
      null;
    if (await isLeadNurtureSendingEnabled(org.organizationId)) {
      const welcome = await runLeadNurtureQueue(org.organizationId);
      const alerts = await runLeadAlertQueue(org.organizationId);
      nurture = { welcome, alerts };
    }
    results.push({ organizationId: org.organizationId, synced, nurture });
  }

  return NextResponse.json({ ok: true, results });
}
