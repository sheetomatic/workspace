import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PRIMARY_ORG_SLUG } from "@/lib/platform";
import { resolveWorkspaceWhatsAppCredentials } from "@/lib/whatsapp-settings";
import { isOfficialWhatsAppConfigured } from "@/lib/integrations/whatsapp-provider";
import { normalizeWhatsAppPhone } from "@/lib/phone";
import { CALLBACK_SENDER_PHONE, callbackAgentConfig } from "@/lib/leads/callback-policy";

/** Read-only, tenant-scoped activation preflight. Never exposes tokens or customer data. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.organizationSlug !== PRIMARY_ORG_SLUG || !["OWNER", "ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Primary workspace admin required" }, { status: 403 });
  }
  const [members, credentials, heartbeat] = await Promise.all([
    prisma.membership.findMany({ where: { organizationId: user.organizationId, deactivatedAt: null },
      select: { userId: true, role: true, user: { select: { name: true } } } }),
    resolveWorkspaceWhatsAppCredentials(user.organizationId),
    prisma.cronHeartbeat.findUnique({ where: { jobKey: `crm-callbacks:${user.organizationId}` },
      select: { lastRunAt: true, lastOk: true } }),
  ]);
  const candidates = members.filter(m => m.user.name?.trim().toLowerCase() === "sumit chandra");
  const owners = members.filter(m => ["OWNER", "ADMIN"].includes(m.role));
  const config = callbackAgentConfig();
  return NextResponse.json({ organizationId: user.organizationId,
    configured: Boolean(config && config.organizationId === user.organizationId),
    configuredAssigneeId: config?.organizationId === user.organizationId ? config.assigneeId : null,
    configuredOwnerId: config?.organizationId === user.organizationId ? config.ownerId : null,
    assigneeCandidates: candidates.map(m => ({ id: m.userId, name: m.user.name })),
    escalationCandidates: owners.map(m => ({ id: m.userId, name: m.user.name })),
    officialCredentialsPresent: isOfficialWhatsAppConfigured(credentials),
    senderMatchesRequestedNumber: normalizeWhatsAppPhone(credentials.businessPhone ?? "") === CALLBACK_SENDER_PHONE,
    providerAuthorizationTested: false,
    hours: "Monday–Saturday 09:00–19:00 Asia/Kolkata", callbackMinutes: 15, heartbeat,
  }, { headers: { "Cache-Control": "no-store" } });
}
