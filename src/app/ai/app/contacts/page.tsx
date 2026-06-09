import Link from "next/link";
import { WaCrmDashboard } from "@/components/saas/wa-crm-dashboard";
import { WaCrmSheetSyncButton } from "@/components/saas/wa-crm-sheet-sync-button";
import { hasMinimumRole } from "@/lib/permissions";
import { requireAiSession } from "@/lib/require-session";
import {
  getWaCrmStats,
  listOverdueWaFollowUps,
  listTodayWaFollowUps,
  listWaCrmLeads,
} from "@/lib/wa-crm";
import { listWorkspaceMembers } from "@/lib/workspace";

export default async function SheetomaticAiContactsPage() {
  const user = await requireAiSession();
  const canSyncSheet =
    user.isSuperAdmin || hasMinimumRole(user.role, "ADMIN");

  const [stats, leads, todayFollowUps, overdueFollowUps, teamMembers] =
    await Promise.all([
      getWaCrmStats(user.organizationId, user.id),
      listWaCrmLeads(user.organizationId),
      listTodayWaFollowUps(user.organizationId),
      listOverdueWaFollowUps(user.organizationId),
      listWorkspaceMembers(user.organizationId),
    ]);

  return (
    <div className="saas-page wa-crm-page">
      <header className="wa-crm-page-head">
        <div>
          <h1>CRM</h1>
          <p>
            Assign WhatsApp leads, schedule follow-ups, and track today&apos;s
            sales pipeline.
          </p>
        </div>
        <div className="wa-crm-page-head-actions">
          {canSyncSheet ? <WaCrmSheetSyncButton /> : null}
          <Link className="wa-crm-head-link wa-crm-btn-wa" href="/ai/app/inbox">
            Open Chats
          </Link>
        </div>
      </header>

      {leads.length === 0 ? (
        <section className="saas-panel wa-crm-empty-state">
          <h2>No leads yet</h2>
          <p>
            Leads appear when someone messages your WhatsApp business number.
            Go live from Campaign to start capturing contacts.
          </p>
          <Link className="btn-cta btn-primary" href="/ai/app/campaign">
            Open Campaign
          </Link>
        </section>
      ) : (
        <WaCrmDashboard
          currentUserId={user.id}
          leads={leads}
          overdueFollowUps={overdueFollowUps}
          stats={stats}
          teamMembers={teamMembers}
          todayFollowUps={todayFollowUps}
        />
      )}
    </div>
  );
}
