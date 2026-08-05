import { after } from "next/server";
import { LeadsCrmWorkspace } from "@/components/saas/leads-crm-workspace";
import { LeadsTeamPerformance } from "@/components/saas/leads-team-performance";
import { currentMonthKeyIst, getTeamPerformance } from "@/lib/leads/team-performance";
import { LeadsPeriodToolbar } from "@/components/saas/leads-period-toolbar";
import { LeadsPipelineCards } from "@/components/saas/leads-pipeline-cards";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import "@/components/saas/leads-machine.css";
import { runLeadsBackgroundMaintenance } from "@/lib/leads/backfill";
import {
  LEADS_SYNC_INTERVAL_LABEL,
  maybeAutoSyncGoogleSheets,
} from "@/lib/leads/auto-sync";
import { readSheetSyncProgress } from "@/lib/leads/sheet-sync-progress";
import { LeadsSheetSyncButton } from "@/components/saas/leads-sheet-sync-button";
import { ensureLeadConnections } from "@/lib/leads/ingest";
import { parseCrmDrawerTab } from "@/lib/leads/crm-open";
import { parseLeadsListParams } from "@/lib/leads/list-params";
import { parseLeadsPeriodParams } from "@/lib/leads/period";
import {
  getCrmNumbersMetricsForPeriod,
  getGoogleSheetsLeadConnection,
  getInboundLeadForCrmDrawer,
  getInboundLeadWorkspaceTotal,
  getLeadsMachineStatsForPeriod,
  getLeadsPipeMetricsForPeriod,
  listInboundLeadsForPeriodPaginated,
} from "@/lib/leads/queries";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";
import { requireCrmSubModule } from "@/lib/crm/crm-access";
import { listLeadServiceCatalog } from "@/lib/leads/service-catalog";
import { getAllSalesOrdersByLeadIds } from "@/lib/leads/sales-orders";
import { listWorkspaceMembers } from "@/lib/workspace";
import { withDbRetry } from "@/lib/db";
import { mapPendingTemplateOrdersByLeadIds } from "@/lib/templates/store";
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
  tab?: string;
  view?: string;
};

type CrmDrawerLead = NonNullable<
  Awaited<ReturnType<typeof getInboundLeadForCrmDrawer>>
>;

function serializeLead(lead: CrmDrawerLead) {
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
    trainingRequired: lead.trainingRequired,
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
      type: item.type,
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
  await requireCrmSubModule(user, "leads");
  await ensureLeadConnections(user.organizationId);

  const params = await searchParams;
  const period = parseLeadsPeriodParams(params);
  const listParams = parseLeadsListParams(params);
  const canManage = hasMinimumRole(user.role, "MANAGER");
  // Admins/owners (and platform super-admins) see the full workspace;
  // everyone else only sees leads assigned to them.
  const canSeeAllLeads =
    user.isSuperAdmin || hasMinimumRole(user.role, "ADMIN");
  const leadScope = canSeeAllLeads ? undefined : { assignedToId: user.id };
  const focusLeadId = params.leadId?.trim() || null;
  const initialTab = parseCrmDrawerTab(params.tab);
  const focusMode = Boolean(focusLeadId);

  after(async () => {
    try {
      await runLeadsBackgroundMaintenance(user.organizationId);
    } catch (error) {
      console.error("leads background maintenance", error);
    }
    try {
      // Continues partial Google Sheet imports (e.g. through row 897) when CRM is opened.
      await maybeAutoSyncGoogleSheets(user.organizationId);
    } catch (error) {
      console.error("leads google sheets auto sync", error);
    }
  });

  if (focusMode && focusLeadId) {
    const [lead, teamMembers, serviceCatalog, organization] = await withDbRetry(
      (db) =>
        Promise.all([
          getInboundLeadForCrmDrawer(user.organizationId, focusLeadId, leadScope),
          listWorkspaceMembers(user.organizationId),
          listLeadServiceCatalog(user.organizationId),
          db.organization.findUnique({
            where: { id: user.organizationId },
            select: { name: true, logoUrl: true },
          }),
        ]),
    );

    const salesOrdersByLead = lead
      ? await getAllSalesOrdersByLeadIds(user.organizationId, [lead.id])
      : new Map();
    const pendingTemplateByLead = lead
      ? await mapPendingTemplateOrdersByLeadIds([lead.id])
      : new Map();
    const leadsWithSalesOrders = lead
      ? [
          {
            ...serializeLead(lead),
            salesOrders: salesOrdersByLead.get(lead.id) ?? [],
            salesOrder: (salesOrdersByLead.get(lead.id) ?? [])[0] ?? null,
            pendingTemplateOrders: pendingTemplateByLead.get(lead.id) ?? [],
          },
        ]
      : [];

    return (
      <div className="saas-page leads-machine-page leads-machine-page--focus">
        <TaskPageToolbar
          title="CRM"
          actions={
            <Link className="btn-secondary btn-sm" href="/app/leads?period=all">
              All leads
            </Link>
          }
        />

        {!lead ? (
          <p className="leads-machine-muted" style={{ marginTop: "1rem" }}>
            Lead not found.{" "}
            <Link href="/app/leads?period=all">Back to CRM</Link>
          </p>
        ) : null}

        <LeadsCrmWorkspace
          canManage={canManage}
          currentUserId={user.id}
          focusMode
          initialSelectedLeadId={lead?.id ?? focusLeadId}
          initialTab={initialTab}
          leads={leadsWithSalesOrders}
          listParams={params}
          organizationLogoUrl={organization?.logoUrl ?? null}
          organizationName={organization?.name ?? "Sheetomatic"}
          page={1}
          period={period.type}
          periodLabel={period.periodLabel}
          sort={listParams.sort}
          view={listParams.view}
          teamMembers={teamMembers}
          total={leadsWithSalesOrders.length}
          totalPages={1}
          workspaceTotal={leadsWithSalesOrders.length}
          serviceCatalog={serviceCatalog.map((item) => ({
            id: item.id,
            serviceCategory: item.serviceCategory,
            subCategory: item.subCategory,
          }))}
        />
      </div>
    );
  }

  // withDbRetry: Neon can drop/refuse connections for a moment (cold start,
  // post-deploy churn) — retry the whole load once instead of erroring the page.
  const [periodStats, pipeMetrics, numbersMetrics, leadPage, teamMembers, sheetsConnection, workspaceTotal, serviceCatalog, organization, teamPerformance] =
    await withDbRetry((db) =>
      Promise.all([
        getLeadsMachineStatsForPeriod(user.organizationId, period, leadScope),
        getLeadsPipeMetricsForPeriod(user.organizationId, period, leadScope),
        getCrmNumbersMetricsForPeriod(user.organizationId, period, leadScope),
        listInboundLeadsForPeriodPaginated(user.organizationId, period, {
          page: listParams.page,
          pageSize: listParams.pageSize,
          sort: listParams.sort,
          status: listParams.status,
          category: listParams.category,
          // Text search filters client-side on the loaded page (no workspace reload).
          includeArchived: listParams.includeArchived,
          assignedToId: leadScope?.assignedToId,
        }),
        listWorkspaceMembers(user.organizationId),
        getGoogleSheetsLeadConnection(user.organizationId),
        getInboundLeadWorkspaceTotal(user.organizationId, leadScope),
        listLeadServiceCatalog(user.organizationId),
        db.organization.findUnique({
          where: { id: user.organizationId },
          select: { name: true, logoUrl: true },
        }),
        canSeeAllLeads
          ? getTeamPerformance(user.organizationId, currentMonthKeyIst())
          : Promise.resolve(null),
      ]),
    );

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

  const salesOrdersByLead = await getAllSalesOrdersByLeadIds(
    user.organizationId,
    leadPage.leads.map((lead) => lead.id),
  );
  const pendingTemplateByLead = await mapPendingTemplateOrdersByLeadIds(
    leadPage.leads.map((lead) => lead.id),
  );
  const leadsWithSalesOrders = leadPage.leads.map((lead) => {
    const salesOrders = salesOrdersByLead.get(lead.id) ?? [];
    return {
      ...serializeLead(lead),
      salesOrders,
      salesOrder: salesOrders[0] ?? null,
      pendingTemplateOrders: pendingTemplateByLead.get(lead.id) ?? [],
    };
  });

  return (
    <div className="saas-page leads-machine-page">
      <TaskPageToolbar
        title="CRM"
        actions={
          <div className="leads-header-actions">
            <span
              className="leads-sync-pill"
              title={
                sheetSyncProgress
                  ? `Sheet import in progress — ${sheetSyncProgress.cursor} of ${sheetSyncProgress.total} rows. Click Continue import or wait ${LEADS_SYNC_INTERVAL_LABEL}.`
                  : `Auto sync ${LEADS_SYNC_INTERVAL_LABEL}`
              }
            >
              {syncPillLabel}
            </span>
            <LeadsSheetSyncButton
              canManage={canManage}
              importProgressLabel={
                sheetSyncProgress
                  ? `${sheetSyncProgress.cursor}/${sheetSyncProgress.total}`
                  : null
              }
            />
            {canManage ? (
              <Link
                className="btn-secondary btn-sm"
                href="/app/leads/settings#nurture-messages"
              >
                Setup alerts
              </Link>
            ) : null}
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

      {canSeeAllLeads && teamPerformance ? (
        <LeadsTeamPerformance initial={teamPerformance} />
      ) : null}

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
        currentUserId={user.id}
        focusMode={false}
        initialSelectedLeadId={params.leadId ?? null}
        initialTab={initialTab}
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
