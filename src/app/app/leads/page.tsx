import Link from "next/link";
import { LeadsConnectionAlert } from "@/components/saas/leads-connection-alert";
import { LeadsMachineDashboard } from "@/components/saas/leads-machine-dashboard";
import { LeadsMachineOverview } from "@/components/saas/leads-machine-overview";
import { LeadsPeriodToolbar } from "@/components/saas/leads-period-toolbar";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import "@/components/saas/leads-machine.css";
import {
  getGoogleSheetsServiceAccountEmail,
  isGoogleSheetsAuthConfigured,
} from "@/lib/integrations/google-sheets-auth";
import { hasMinimumRole } from "@/lib/permissions";
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

  const isLive =
    sheetsSetup.enabled &&
    Boolean(sheetsSetup.lastSyncAt) &&
    !sheetsSetup.lastSyncError;

  return (
    <div className="saas-page leads-machine-page">
      <TaskPageToolbar
        title="Leads Machine"
        description="Google Sheets intake with weekly, monthly, quarterly, and yearly views. Qualified leads bridge into FMS Lead to Sales."
        actions={
          <>
            {isLive ? (
              <span className="leads-header-live-badge">
                Live · Google Sheets
                {sheetsSetup.lastSyncAt
                  ? ` · ${new Date(sheetsSetup.lastSyncAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}`
                  : ""}
              </span>
            ) : sheetsSetup.enabled ? (
              <span className="leads-header-setup-badge">Setup in progress</span>
            ) : null}
            {canManage ? (
              <Link className="btn-secondary btn-sm" href="/app/leads/settings">
                Google Sheets settings
              </Link>
            ) : null}
          </>
        }
      />

      <LeadsConnectionAlert
        canManage={canManage}
        leadsCount={lifetimeStats.total}
        status={sheetsSetup}
      />

      <LeadsPeriodToolbar period={period} />

      <LeadsMachineOverview
        lifetimeTotal={lifetimeStats.total}
        periodStats={periodStats}
      />

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
