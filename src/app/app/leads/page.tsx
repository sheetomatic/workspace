import Link from "next/link";
import { LeadsCrmWorkspace } from "@/components/saas/leads-crm-workspace";
import { LeadsPeriodToolbar } from "@/components/saas/leads-period-toolbar";
import { LeadsPipelineCards } from "@/components/saas/leads-pipeline-cards";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import "@/components/saas/leads-machine.css";
import { categorizeLeadRequirement, defaultPipeValueForCategory } from "@/lib/leads/categories";
import { maybeAutoSyncGoogleSheets, LEADS_SYNC_INTERVAL_LABEL } from "@/lib/leads/auto-sync";
import { ensureLeadConnections } from "@/lib/leads/ingest";
import { parseLeadsListParams } from "@/lib/leads/list-params";
import { parseLeadsPeriodParams } from "@/lib/leads/period";
import {
  getGoogleSheetsLeadConnection,
  getLeadsMachineStatsForPeriod,
  getLeadsPipeMetricsForPeriod,
  listInboundLeadsForPeriodPaginated,
} from "@/lib/leads/queries";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";
import { listWorkspaceMembers } from "@/lib/workspace";
import { prisma } from "@/lib/db";

type PageProps = {
  searchParams: Promise<LeadsListSearchParams>;
};

type LeadsListSearchParams = {
  period?: string;
  week?: string;
  month?: string;
  quarter?: string;
  year?: string;
  status?: string;
  category?: string;
  page?: string;
  sort?: string;
  q?: string;
};

function serializeLead(lead: Awaited<ReturnType<typeof listInboundLeadsForPeriodPaginated>>["leads"][number]) {
  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    requirement: lead.requirement,
    category: lead.category,
    status: lead.status,
    discussionNotes: lead.discussionNotes,
    quotationValue: lead.quotationValue?.toString() ?? null,
    pipeValue: lead.pipeValue?.toString() ?? null,
    nextFollowUpAt: lead.nextFollowUpAt?.toISOString() ?? null,
    capturedAt: lead.capturedAt?.toISOString() ?? null,
    createdAt: lead.createdAt.toISOString(),
    assignedTo: lead.assignedTo,
    followUps: lead.followUps.map((item) => ({
      id: item.id,
      scheduledAt: item.scheduledAt.toISOString(),
      notes: item.notes,
    })),
    activities: lead.activities.map((item) => ({
      id: item.id,
      type: item.type,
      body: item.body,
      createdAt: item.createdAt.toISOString(),
      createdBy: item.createdBy,
    })),
  };
}

export default async function LeadsMachinePage({ searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "FMS" });
  await ensureLeadConnections(user.organizationId);

  const uncategorized = await prisma.inboundLead.findMany({
    where: { organizationId: user.organizationId, category: null },
    select: { id: true, requirement: true },
    take: 100,
  });
  if (uncategorized.length > 0) {
    await Promise.all(
      uncategorized.map((lead) => {
        const category = categorizeLeadRequirement(lead.requirement);
        return prisma.inboundLead.update({
          where: { id: lead.id },
          data: {
            category,
            pipeValue: defaultPipeValueForCategory(category),
          },
        });
      }),
    );
  }

  const params = await searchParams;
  const period = parseLeadsPeriodParams(params);
  const listParams = parseLeadsListParams(params);
  const canManage = hasMinimumRole(user.role, "MANAGER");
  const isAdmin = hasMinimumRole(user.role, "ADMIN");

  if (isAdmin) {
    await maybeAutoSyncGoogleSheets(user.organizationId);
  }

  const [periodStats, pipeMetrics, leadPage, teamMembers, sheetsConnection] =
    await Promise.all([
      getLeadsMachineStatsForPeriod(user.organizationId, period),
      getLeadsPipeMetricsForPeriod(user.organizationId, period),
      listInboundLeadsForPeriodPaginated(user.organizationId, period, listParams),
      listWorkspaceMembers(user.organizationId),
      getGoogleSheetsLeadConnection(user.organizationId),
    ]);

  const lastSyncLabel = sheetsConnection?.lastSyncAt
    ? new Date(sheetsConnection.lastSyncAt).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not synced yet";

  return (
    <div className="saas-page leads-machine-page">
      <TaskPageToolbar
        title="Leads Machine"
        description="Google Sheets intake · AI categories · pipeline value · follow-ups and quotations."
        actions={
          <>
            <span className="leads-sync-meta">
              Last sync: {lastSyncLabel} · Auto {LEADS_SYNC_INTERVAL_LABEL}
            </span>
            {canManage ? (
              <Link
                className="leads-setup-icon-btn"
                href="/app/leads/settings"
                title="Google Sheets setup"
                aria-label="Google Sheets setup"
              >
                ⚙
              </Link>
            ) : null}
          </>
        }
      />

      <LeadsPeriodToolbar period={period} />

      <LeadsPipelineCards
        activeCategory={listParams.category}
        activeStatus={listParams.status}
        baseParams={params}
        byStatus={periodStats.byStatus}
        pipeMetrics={pipeMetrics}
      />

      <LeadsCrmWorkspace
        canManage={canManage}
        leads={leadPage.leads.map(serializeLead)}
        listParams={params}
        page={leadPage.page}
        periodLabel={period.periodLabel}
        sort={listParams.sort}
        teamMembers={teamMembers}
        total={leadPage.total}
        totalPages={leadPage.totalPages}
      />
    </div>
  );
}
