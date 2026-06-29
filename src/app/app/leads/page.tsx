import Link from "next/link";
import { LeadsGoogleSheetsSetupBanner } from "@/components/saas/leads-google-sheets-setup";
import { LeadsMachineDashboard } from "@/components/saas/leads-machine-dashboard";
import { LeadsPeriodToolbar } from "@/components/saas/leads-period-toolbar";
import "@/components/saas/leads-machine.css";
import {
  getGoogleSheetsServiceAccountEmail,
  isGoogleSheetsAuthConfigured,
} from "@/lib/integrations/google-sheets-auth";
import { hasMinimumRole } from "@/lib/permissions";
import { LEAD_CHANNEL_LABELS } from "@/lib/leads/channels";
import { ensureLeadConnections } from "@/lib/leads/ingest";
import { parseLeadsPeriodParams } from "@/lib/leads/period";
import {
  getGoogleSheetsLeadConnection,
  getLeadsMachineStats,
  getLeadsMachineStatsForPeriod,
  listInboundLeadsForPeriod,
  listOverdueLeadFollowUps,
  listTodayLeadFollowUps,
} from "@/lib/leads/queries";
import { requireSession } from "@/lib/require-session";
import { listWorkspaceMembers } from "@/lib/workspace";

type PageProps = {
  searchParams: Promise<{
    period?: string;
    week?: string;
    month?: string;
    quarter?: string;
    year?: string;
  }>;
};

export default async function LeadsMachinePage({ searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "FMS" });
  await ensureLeadConnections(user.organizationId);

  const params = await searchParams;
  const period = parseLeadsPeriodParams(params);
  const canManage = hasMinimumRole(user.role, "MANAGER");

  const [periodStats, lifetimeStats, leads, todayFollowUps, overdueFollowUps, teamMembers, sheetsConnection] =
    await Promise.all([
      getLeadsMachineStatsForPeriod(user.organizationId, period),
      getLeadsMachineStats(user.organizationId),
      listInboundLeadsForPeriod(user.organizationId, period),
      listTodayLeadFollowUps(user.organizationId),
      listOverdueLeadFollowUps(user.organizationId),
      listWorkspaceMembers(user.organizationId),
      getGoogleSheetsLeadConnection(user.organizationId),
    ]);

  const sheetsSetup = {
    enabled: sheetsConnection?.enabled ?? false,
    lastSyncAt: sheetsConnection?.lastSyncAt ?? null,
    lastSyncError: sheetsConnection?.lastSyncError ?? null,
    sheetsAuthConfigured: isGoogleSheetsAuthConfigured(),
    serviceAccountEmail: getGoogleSheetsServiceAccountEmail(),
  };

  return (
    <div className="saas-page leads-machine-page">
      <header className="saas-page-head">
        <div>
          <h1>Leads Machine</h1>
          <p>
            Phase 1: Google Sheets intake with week, month, quarter, and year views.
            Leads bridge into FMS Lead to Sales when a matching workflow is active.
          </p>
        </div>
        {canManage ? (
          <Link className="btn-secondary" href="/app/leads/settings">
            Connect Google Sheets
          </Link>
        ) : null}
      </header>

      <LeadsGoogleSheetsSetupBanner canManage={canManage} status={sheetsSetup} />

      <LeadsPeriodToolbar period={period} />

      <div className="saas-stat-grid">
        <div className="saas-stat-card">
          <span>Leads in period</span>
          <strong>{periodStats.total}</strong>
        </div>
        <div className="saas-stat-card">
          <span>Open pipeline</span>
          <strong>{periodStats.openPipeline}</strong>
        </div>
        <div className="saas-stat-card">
          <span>Won</span>
          <strong>{periodStats.won}</strong>
        </div>
        <div className="saas-stat-card">
          <span>Conversion</span>
          <strong>{periodStats.conversionRate}%</strong>
        </div>
        <div className="saas-stat-card">
          <span>Linked to FMS</span>
          <strong>{periodStats.withFms}</strong>
        </div>
        <div className="saas-stat-card">
          <span>Lifetime leads</span>
          <strong>{lifetimeStats.total}</strong>
        </div>
      </div>

      <div className="leads-machine-channel-stats">
        {Object.entries(periodStats.byChannel).map(([channel, count]) => (
          <span key={channel} className="leads-channel-badge">
            {LEAD_CHANNEL_LABELS[channel as keyof typeof LEAD_CHANNEL_LABELS]}: {count}
          </span>
        ))}
      </div>

      <div className="leads-status-grid">
        {Object.entries(periodStats.byStatus).map(([status, count]) => (
          <div key={status} className="leads-status-pill">
            <span>{status.replaceAll("_", " ")}</span>
            <strong>{count}</strong>
          </div>
        ))}
      </div>

      <LeadsMachineDashboard
        canManage={canManage}
        leads={leads}
        overdueFollowUps={overdueFollowUps}
        periodLabel={period.periodLabel}
        teamMembers={teamMembers}
        todayFollowUps={todayFollowUps}
      />
    </div>
  );
}
