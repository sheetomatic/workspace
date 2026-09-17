import { after } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LeadsCrmWorkspace } from "@/components/saas/leads-crm-workspace";
import { LeadsPeriodToolbar } from "@/components/saas/leads-period-toolbar";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import "@/components/saas/leads-machine.css";
import { runLeadsBackgroundMaintenance } from "@/lib/leads/backfill";
import {
  LEADS_SYNC_INTERVAL_LABEL,
  maybeAutoSyncGoogleSheets,
} from "@/lib/leads/auto-sync";
import {
  formatSheetSyncProgressLabel,
  readSheetSyncProgress,
} from "@/lib/leads/sheet-sync-progress";
import { LeadsSheetSyncButton } from "@/components/saas/leads-sheet-sync-button";
import { ensureLeadConnections } from "@/lib/leads/ingest";
import { parseCrmDrawerTab } from "@/lib/leads/crm-open";
import { parseLeadsListParams } from "@/lib/leads/list-params";
import { parseLeadsPeriodParams } from "@/lib/leads/period";
import {
  getGoogleSheetsLeadConnection,
  getInboundLeadForCrmDrawer,
  getInboundLeadWorkspaceTotal,
  listInboundLeadsForPeriodPaginated,
} from "@/lib/leads/queries";
import {
  serializeCrmDrawerLead,
  serializeCrmListLead,
  withCrmDrawerExtras,
} from "@/lib/leads/crm-lead-payload";
import { importSheetLeadsMatchingSearch } from "@/lib/leads/search-sheet";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";
import { requireCrmSubModule } from "@/lib/crm/crm-access";
import { listWaCampaignOptions } from "@/lib/crm/wa-campaigns";
import { NEXT_TIME_LEAD_STATUSES } from "@/lib/leads/status-labels";
import { listLeadServiceCatalog, serializeServiceCatalogItem } from "@/lib/leads/service-catalog";
import { listActiveFmsTemplatesForLead } from "@/lib/leads/fms-bridge";
import { hasWorkspaceModule } from "@/lib/workspace-modules";
import { getAllSalesOrdersByLeadIds } from "@/lib/leads/sales-orders";
import { listWorkspaceMembers } from "@/lib/workspace";
import { withDbRetry } from "@/lib/db";
import { mapPendingTemplateOrdersByLeadIds } from "@/lib/templates/store";
import { getWorkspaceOrganization } from "@/lib/workspace-shell-data";
import { LeadsCrmSecondary } from "@/app/app/leads/(crm)/leads-crm-secondary";
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

export default async function LeadsMachinePage({ searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "CRM" });
  await requireCrmSubModule(user, "leads");
  try {
    await withDbRetry(() => ensureLeadConnections(user.organizationId));
  } catch (error) {
    // Connections can wait — do not block the leads list on a Neon flap.
    console.error("leads ensureLeadConnections", error);
  }

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

  if (
    !focusMode &&
    listParams.status &&
    NEXT_TIME_LEAD_STATUSES.includes(listParams.status)
  ) {
    redirect("/app/leads/next-time");
  }

  after(async () => {
    // Let the page response release DB pool slots before background work.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    try {
      await runLeadsBackgroundMaintenance(user.organizationId);
    } catch (error) {
      console.error("leads background maintenance", error);
    }
    try {
      // Continues partial Google Sheet imports when CRM is opened.
      await maybeAutoSyncGoogleSheets(user.organizationId);
    } catch (error) {
      console.error("leads google sheets auto sync", error);
    }
  });

  if (focusMode && focusLeadId) {
    const fmsEnabled = hasWorkspaceModule(user, "FMS");
    const [lead, teamMembers, serviceCatalog, organization, fmsTemplates, campaignOptions] =
      await withDbRetry(() =>
        Promise.all([
          getInboundLeadForCrmDrawer(user.organizationId, focusLeadId, leadScope),
          listWorkspaceMembers(user.organizationId),
          listLeadServiceCatalog(user.organizationId),
          getWorkspaceOrganization(user.organizationId),
          fmsEnabled
            ? listActiveFmsTemplatesForLead(user.organizationId)
            : Promise.resolve([]),
          listWaCampaignOptions(user.organizationId),
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
          withCrmDrawerExtras(
            serializeCrmDrawerLead(lead),
            salesOrdersByLead.get(lead.id) ?? [],
            pendingTemplateByLead.get(lead.id) ?? [],
          ),
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
          serviceCatalog={serviceCatalog.map(serializeServiceCatalogItem)}
          canUseFms={fmsEnabled}
          fmsTemplates={fmsTemplates}
          campaignOptions={campaignOptions}
        />
      </div>
    );
  }

  // Search also pulls matching rows from the connected Google Sheet so
  // unsynced names (e.g. Shyam) appear instead of only the imported window.
  if (listParams.q) {
    try {
      await importSheetLeadsMatchingSearch({
        organizationId: user.organizationId,
        q: listParams.q,
      });
    } catch (error) {
      console.error("leads sheet search", error);
    }
  }

  const fmsEnabled = hasWorkspaceModule(user, "FMS");
  const [
    leadPage,
    teamMembers,
    serviceCatalog,
    organization,
    workspaceTotal,
    fmsTemplates,
    campaignOptions,
    sheetsConnection,
  ] = await withDbRetry(() =>
    Promise.all([
      listInboundLeadsForPeriodPaginated(user.organizationId, period, {
        page: listParams.page,
        pageSize: listParams.pageSize,
        sort: listParams.sort,
        status: listParams.status,
        category: listParams.category,
        q: listParams.q,
        includeArchived: listParams.includeArchived || Boolean(listParams.q),
        assignedToId: leadScope?.assignedToId,
        excludeStatuses:
          listParams.q || listParams.status
            ? undefined
            : NEXT_TIME_LEAD_STATUSES,
      }),
      listWorkspaceMembers(user.organizationId),
      listLeadServiceCatalog(user.organizationId),
      getWorkspaceOrganization(user.organizationId),
      getInboundLeadWorkspaceTotal(user.organizationId, leadScope),
      fmsEnabled
        ? listActiveFmsTemplatesForLead(user.organizationId)
        : Promise.resolve([]),
      listWaCampaignOptions(user.organizationId),
      getGoogleSheetsLeadConnection(user.organizationId),
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
  const syncProgressLabel = sheetSyncProgress
    ? formatSheetSyncProgressLabel(sheetSyncProgress)
    : null;
  const syncPillLabel = syncProgressLabel
    ? `Importing ${syncProgressLabel}`
    : lastSyncLabel === "Not synced yet"
      ? "Not synced"
      : lastSyncLabel;

  const leadsWithSalesOrders = leadPage.leads.map((lead) =>
    serializeCrmListLead(lead),
  );

  return (
    <div className="saas-page leads-machine-page">
      <TaskPageToolbar
        title="CRM"
        actions={
          <div className="leads-header-actions">
            <span
              className="leads-sync-pill"
              title={
                syncProgressLabel
                  ? `Sheet import in progress — ${syncProgressLabel} rows. Click Continue import or wait ${LEADS_SYNC_INTERVAL_LABEL}.`
                  : `Auto sync ${LEADS_SYNC_INTERVAL_LABEL}`
              }
            >
              {syncPillLabel}
            </span>
            <LeadsSheetSyncButton
              canManage={canManage}
              importProgressLabel={syncProgressLabel}
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

      <Suspense fallback={null}>
        <LeadsCrmSecondary
          organizationId={user.organizationId}
          period={period}
          leadScope={leadScope}
          canSeeAllLeads={canSeeAllLeads}
          activeCategory={listParams.category}
          activeStatus={listParams.status}
          baseParams={params}
        />
      </Suspense>

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
        serviceCatalog={serviceCatalog.map(serializeServiceCatalogItem)}
        canUseFms={fmsEnabled}
        fmsTemplates={fmsTemplates}
        campaignOptions={campaignOptions}
      />
    </div>
  );
}
