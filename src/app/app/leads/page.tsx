import { after } from "next/server";
import { LeadsAlertCenter } from "@/components/saas/leads-alert-center";
import { LeadsCrmWorkspace } from "@/components/saas/leads-crm-workspace";
import { LeadsNumbersDashboard } from "@/components/saas/leads-numbers-dashboard";
import { LeadsPeriodToolbar } from "@/components/saas/leads-period-toolbar";
import { LeadsPipelineCards } from "@/components/saas/leads-pipeline-cards";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import "@/components/saas/leads-machine.css";
import { runLeadsBackgroundMaintenance } from "@/lib/leads/backfill";
import { LEADS_SYNC_INTERVAL_LABEL } from "@/lib/leads/auto-sync";
import { readSheetSyncProgress } from "@/lib/leads/sheet-sync-progress";
import { ensureLeadConnections } from "@/lib/leads/ingest";
import { listCrmAlertCenterItems } from "@/lib/leads/alerts/evaluate";
import { parseLeadsListParams } from "@/lib/leads/list-params";
import { parseLeadsPeriodParams } from "@/lib/leads/period";
import {
  getCrmNumbersMetricsForPeriod,
  getGoogleSheetsLeadConnection,
  getInboundLeadWorkspaceTotal,
  getLeadsMachineStatsForPeriod,
  getLeadsPipeMetricsForPeriod,
  listInboundLeadsForPeriodPaginated,
} from "@/lib/leads/queries";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";
import { listLeadServiceCatalog } from "@/lib/leads/service-catalog";
import { getSalesOrdersByLeadIds } from "@/lib/leads/sales-orders";
import { listWorkspaceMembers } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import Link from "next/link";

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
  archived?: string;
  leadId?: string;
  view?: string;
};

function serializeLead(lead: Awaited<ReturnType<typeof listInboundLeadsForPeriodPaginated>>["leads"][number]) {
  return {
    id: lead.id,
    channel: lead.channel,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    company: lead.company,
    address: lead.address,
    zipCode: lead.zipCode,
    requirement: lead.requirement,
    category: lead.category,
    status: lead.status,
    aiSuggestedStatus: lead.aiSuggestedStatus,
    callingStatus: lead.callingStatus,
    projectStatus: lead.projectStatus,
    score: lead.score ?? null,
    temperature: lead.temperature ?? null,
    utmSource: lead.utmSource ?? null,
    utmMedium: lead.utmMedium ?? null,
    utmCampaign: lead.utmCampaign ?? null,
    utmContent: lead.utmContent ?? null,
    utmTerm: lead.utmTerm ?? null,
    campaign: lead.campaign ?? null,
    landingPage: lead.landingPage ?? null,
    expectedCloseAt: lead.expectedCloseAt?.toISOString() ?? null,
    winProbability: lead.winProbability ?? null,
    archivedAt: lead.archivedAt?.toISOString() ?? null,
    discussionNotes: lead.discussionNotes,
    meetingNotes: lead.meetingNotes,
    quotationValue: lead.quotationValue?.toString() ?? null,
    pipeValue: lead.pipeValue?.toString() ?? null,
    nextFollowUpAt: lead.nextFollowUpAt?.toISOString() ?? null,
    capturedAt: lead.capturedAt?.toISOString() ?? null,
    modifiedAt: lead.modifiedAt?.toISOString() ?? null,
    createdAt: lead.createdAt.toISOString(),
    assignedTo: lead.assignedTo,
    followUps: lead.followUps.map((item) => ({
      id: item.id,
      scheduledAt: item.scheduledAt.toISOString(),
      notes: item.notes,
    })),
    payments: (lead.payments ?? []).map((item) => ({
      id: item.id,
      paymentType: item.paymentType,
      receivedAmount: item.receivedAmount.toString(),
      receivedDate: item.receivedDate.toISOString(),
      paymentMethod: item.paymentMethod,
      notes: item.notes,
    })),
    quotations: (lead.quotations ?? []).map((item) => ({
      id: item.id,
      quotationNumber: item.quotationNumber,
      requestType: item.requestType,
      status: item.status,
      revisionNumber: item.revisionNumber,
      totalAmount: item.totalAmount.toString(),
      subtotal: item.subtotal.toString(),
      quotationDate: item.quotationDate.toISOString(),
      projectStartDate: item.projectStartDate?.toISOString() ?? null,
      endDate: item.endDate?.toISOString() ?? null,
      durationDays: item.durationDays,
      company: item.company,
      address: item.address,
      zipCode: item.zipCode,
      scopeNotes: item.scopeNotes,
      paymentTerms: item.paymentTerms,
      advanceRequired: item.advanceRequired?.toString() ?? null,
      notes: item.notes,
      sentAt: item.sentAt?.toISOString() ?? null,
      lockedAt: item.lockedAt?.toISOString() ?? null,
      shareToken: item.shareToken,
      lines: (item.lines ?? []).map((line) => ({
        id: line.id,
        serviceCategory: line.serviceCategory,
        subCategory: line.subCategory,
        quantity: line.quantity,
        unitPrice: line.unitPrice.toString(),
        lineTotal: line.lineTotal.toString(),
      })),
    })),
    offeredServices: (lead.offeredServices ?? []).map((item) => ({
      id: item.id,
      catalogId: item.catalogId,
      serviceCategory: item.serviceCategory,
      subCategory: item.subCategory,
      unitPrice: item.unitPrice?.toString() ?? null,
    })),
    activities: (lead.activities ?? []).map((item) => ({
      id: item.id,
      type: item.type,
      body: item.body,
      createdAt: item.createdAt.toISOString(),
      createdBy: item.createdBy,
    })),
  };
}

export default async function LeadsMachinePage({ searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "CRM" });
  await ensureLeadConnections(user.organizationId);

  const params = await searchParams;
  const period = parseLeadsPeriodParams(params);
  const listParams = parseLeadsListParams(params);
  const canManage = hasMinimumRole(user.role, "MANAGER");

  after(async () => {
    try {
      await runLeadsBackgroundMaintenance(user.organizationId);
    } catch (error) {
      console.error("leads background maintenance", error);
    }
  });

  const [periodStats, pipeMetrics, numbersMetrics, alertItems, leadPage, teamMembers, sheetsConnection, workspaceTotal, serviceCatalog, organization] =
    await Promise.all([
      getLeadsMachineStatsForPeriod(user.organizationId, period),
      getLeadsPipeMetricsForPeriod(user.organizationId, period),
      getCrmNumbersMetricsForPeriod(user.organizationId, period),
      listCrmAlertCenterItems(user.organizationId, { limit: 40 }),
      listInboundLeadsForPeriodPaginated(user.organizationId, period, {
        page: listParams.page,
        pageSize: listParams.pageSize,
        sort: listParams.sort,
        status: listParams.status,
        category: listParams.category,
        // Text search filters client-side on the loaded page (no workspace reload).
        includeArchived: listParams.includeArchived,
      }),
      listWorkspaceMembers(user.organizationId),
      getGoogleSheetsLeadConnection(user.organizationId),
      getInboundLeadWorkspaceTotal(user.organizationId),
      listLeadServiceCatalog(user.organizationId),
      prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: { name: true, logoUrl: true },
      }),
    ]);

  const lastSyncLabel = sheetsConnection?.lastSyncAt
    ? new Date(sheetsConnection.lastSyncAt).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not synced yet";
  const sheetSyncProgress = readSheetSyncProgress(sheetsConnection?.config);
  const syncPillLabel = sheetSyncProgress
    ? `Importing ${sheetSyncProgress.cursor}/${sheetSyncProgress.total}`
    : lastSyncLabel === "Not synced yet"
      ? "Not synced"
      : lastSyncLabel;

  const salesOrdersByLead = await getSalesOrdersByLeadIds(
    user.organizationId,
    leadPage.leads.map((lead) => lead.id),
  );
  const leadsWithSalesOrders = leadPage.leads.map((lead) => ({
    ...serializeLead(lead),
    salesOrder: salesOrdersByLead.get(lead.id) ?? null,
  }));

  return (
    <div className="saas-page leads-machine-page">
      <TaskPageToolbar
        title="CRM"
        actions={
          <div className="leads-header-actions">
            <span className="leads-sync-pill" title={`Auto sync ${LEADS_SYNC_INTERVAL_LABEL}`}>
              {syncPillLabel}
            </span>
            {canManage ? (
              <Link
                className="leads-setup-icon-btn"
                href="/app/leads/settings"
                title="Setup"
                aria-label="Google Sheets setup"
              >
                ⚙
              </Link>
            ) : null}
          </div>
        }
      />

      <LeadsPeriodToolbar period={period} />

      <LeadsAlertCenter
        baseParams={params}
        canSend={canManage}
        items={alertItems}
      />

      <LeadsNumbersDashboard
        metrics={numbersMetrics}
        periodLabel={period.periodLabel}
      />

      <LeadsPipelineCards
        activeCategory={listParams.category}
        activeStatus={listParams.status}
        baseParams={params}
        byStatus={periodStats.byStatus}
        numbersMetrics={numbersMetrics}
        pipeMetrics={pipeMetrics}
      />

      <LeadsCrmWorkspace
        canManage={canManage}
        initialSelectedLeadId={params.leadId ?? null}
        leads={leadsWithSalesOrders}
        listParams={params}
        organizationLogoUrl={organization?.logoUrl ?? null}
        organizationName={organization?.name ?? "Sheetomatic"}
        page={leadPage.page}
        period={period.type}
        periodLabel={period.periodLabel}
        sort={listParams.sort}
        view={listParams.view}
        teamMembers={teamMembers}
        total={leadPage.total}
        totalPages={leadPage.totalPages}
        workspaceTotal={workspaceTotal}
        serviceCatalog={serviceCatalog.map((item) => ({
          id: item.id,
          serviceCategory: item.serviceCategory,
          subCategory: item.subCategory,
        }))}
      />
    </div>
  );
}
