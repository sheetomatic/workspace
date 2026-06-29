import Link from "next/link";
import { LeadsMachineDashboard } from "@/components/saas/leads-machine-dashboard";
import "@/components/saas/leads-machine.css";
import { hasMinimumRole } from "@/lib/permissions";
import {
  getLeadsMachineStats,
  listInboundLeads,
  listOverdueLeadFollowUps,
  listTodayLeadFollowUps,
} from "@/lib/leads/queries";
import { ensureLeadConnections } from "@/lib/leads/ingest";
import { requireSession } from "@/lib/require-session";
import { listWorkspaceMembers } from "@/lib/workspace";
import { LEAD_CHANNEL_LABELS } from "@/lib/leads/channels";

export default async function LeadsMachinePage() {
  const user = await requireSession(undefined, { module: "FMS" });
  await ensureLeadConnections(user.organizationId);

  const canManage = hasMinimumRole(user.role, "MANAGER");

  const [stats, leads, todayFollowUps, overdueFollowUps, teamMembers] =
    await Promise.all([
      getLeadsMachineStats(user.organizationId),
      listInboundLeads(user.organizationId),
      listTodayLeadFollowUps(user.organizationId),
      listOverdueLeadFollowUps(user.organizationId),
      listWorkspaceMembers(user.organizationId),
    ]);

  return (
    <div className="saas-page leads-machine-page">
      <header className="saas-page-head">
        <div>
          <h1>Leads Machine</h1>
          <p>
            All inbound leads from WhatsApp, Instagram, Facebook, and Google Sheets
            in one place - follow-ups tracked through FMS Lead to Sales.
          </p>
        </div>
        {canManage ? (
          <Link className="btn-secondary" href="/app/leads/settings">
            Source settings
          </Link>
        ) : null}
      </header>

      <div className="saas-stat-grid">
        <div className="saas-stat-card">
          <span>Total leads</span>
          <strong>{stats.total}</strong>
        </div>
        <div className="saas-stat-card">
          <span>Open pipeline</span>
          <strong>{stats.openPipeline}</strong>
        </div>
        <div className="saas-stat-card">
          <span>Linked to FMS</span>
          <strong>{stats.withFms}</strong>
        </div>
        <div className="saas-stat-card">
          <span>Today follow-ups</span>
          <strong>{stats.todayFollowUps}</strong>
        </div>
      </div>

      <div className="leads-machine-channel-stats">
        {Object.entries(stats.byChannel).map(([channel, count]) => (
          <span key={channel} className="leads-channel-badge">
            {LEAD_CHANNEL_LABELS[channel as keyof typeof LEAD_CHANNEL_LABELS]}: {count}
          </span>
        ))}
      </div>

      <LeadsMachineDashboard
        canManage={canManage}
        leads={leads}
        overdueFollowUps={overdueFollowUps}
        teamMembers={teamMembers}
        todayFollowUps={todayFollowUps}
      />
    </div>
  );
}
