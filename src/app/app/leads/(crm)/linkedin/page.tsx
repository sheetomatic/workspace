import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireLinkedInUser } from "@/lib/leads/linkedin/access";
import { getLinkedInConfig } from "@/lib/leads/linkedin/config";
import { LinkedInConnectionsPanel } from "@/components/saas/linkedin-connections-panel";

export default async function LinkedInConnectionsPage({ searchParams }: {
  searchParams: Promise<{ linkedin?: string }>;
}) {
  const user = await requireLinkedInUser();
  const params = await searchParams;
  const accounts = await prisma.linkedInAccount.findMany({
    where: { organizationId: user.organizationId, ownerUserId: user.id },
    select: {
      id: true, displayName: true, enabled: true, accessTokenExpiresAt: true,
      baselineCompletedAt: true, lastSyncAt: true, lastSyncError: true,
      _count: { select: { acceptances: { where: { baseline: false, leadId: { not: null } } } } },
    },
    orderBy: { createdAt: "asc" },
  });
  return (
    <div className="saas-page">
      <header className="saas-page-head">
        <Link className="btn-secondary btn-sm" href="/app/leads">← Back to leads</Link>
        <h1>LinkedIn connections</h1>
        <p>Automatic lead intake for {user.organizationName}.</p>
      </header>
      <LinkedInConnectionsPanel
        configured={Boolean(getLinkedInConfig())}
        callbackStatus={params.linkedin}
        accounts={accounts.map((account) => ({
          id: account.id, displayName: account.displayName, enabled: account.enabled,
          needsReconnect: (!account.enabled && Boolean(account.lastSyncError)) ||
            (account.enabled && (!account.accessTokenExpiresAt || account.accessTokenExpiresAt <= new Date())),
          baselineCompletedAt: account.baselineCompletedAt?.toISOString() ?? null,
          lastSyncAt: account.lastSyncAt?.toISOString() ?? null,
          lastSyncError: account.lastSyncError, recorded: account._count.acceptances,
        }))}
      />
    </div>
  );
}
