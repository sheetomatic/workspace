import Link from "next/link";
import { after } from "next/server";
import { LeadsCrmWorkspace } from "@/components/saas/leads-crm-workspace";
import { LeadsPeriodToolbar } from "@/components/saas/leads-period-toolbar";
import { LeadsPipelineCards } from "@/components/saas/leads-pipeline-cards";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import "@/components/saas/leads-machine.css";
import type { InboundLeadStatus } from "@prisma/client";
import { categorizeLeadRequirement, migrateLegacyLeadCategory, type LeadCategoryId } from "@/lib/leads/categories";
import { migrateLegacyLeadStatus } from "@/lib/leads/status-labels";
import { maybeAutoSyncGoogleSheets, LEADS_SYNC_INTERVAL_LABEL } from "@/lib/leads/auto-sync";
import { ensureLeadConnections } from "@/lib/leads/ingest";
import { parseLeadsListParams } from "@/lib/leads/list-params";
import { parseLeadsPeriodParams } from "@/lib/leads/period";
import {
  getGoogleSheetsLeadConnection,
  getInboundLeadWorkspaceTotal,
  getLeadsMachineStatsForPeriod,
  getLeadsPipeMetricsForPeriod,
  listInboundLeadsForPeriodPaginated,
} from "@/lib/leads/queries";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";
import { listLeadServiceCatalog } from "@/lib/leads/service-catalog";
import { inferLeadStageFromRequirement } from "@/lib/leads/stage-ai";
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
    company: lead.company,
    address: lead.address,
    zipCode: lead.zipCode,
    requirement: lead.requirement,
    category: lead.category,
    status: lead.status,
    aiSuggestedStatus: lead.aiSuggestedStatus,
    callingStatus: lead.callingStatus,
    projectStatus: lead.projectStatus,
    discussionNotes: lead.discussionNotes,
    meetingNotes: lead.meetingNotes,
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
  const user = await requireSession(undefined, { module: "FMS" });
  await ensureLeadConnections(user.organizationId);

  try {
    const leadsToNormalize = await prisma.inboundLead.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, requirement: true, category: true, status: true },
      take: 250,
    });
    const patchById = new Map<
      string,
      { category?: LeadCategoryId; status?: InboundLeadStatus }
    >();
    for (const lead of leadsToNormalize) {
      const patch = patchById.get(lead.id) ?? {};
      if (!lead.category) {
        patch.category = categorizeLeadRequirement(lead.requirement);
      } else {
        const migratedCategory = migrateLegacyLeadCategory(lead.category);
        if (migratedCategory && migratedCategory !== lead.category) {
          patch.category = migratedCategory;
        }
      }
      const migratedStatus = migrateLegacyLeadStatus(lead.status);
      if (migratedStatus && migratedStatus !== lead.status) {
        patch.status = migratedStatus;
      }
      if (patch.category || patch.status) {
        patchById.set(lead.id, patch);
      }
    }
    if (patchById.size > 0) {
      await Promise.all(
        Array.from(patchById.entries()).map(([id, patch]) =>
          prisma.inboundLead.update({
            where: { id },
            data: patch,
          }),
        ),
      );
    }
  } catch (error) {
    console.error("leads category backfill", error);
  }

  try {
    const missingAi = await prisma.inboundLead.findMany({
      where: { organizationId: user.organizationId, aiSuggestedStatus: null },
      select: { id: true, requirement: true },
      take: 200,
    });
    if (missingAi.length > 0) {
      await Promise.all(
        missingAi.map((lead) =>
          prisma.inboundLead.update({
            where: { id: lead.id },
            data: { aiSuggestedStatus: inferLeadStageFromRequirement(lead.requirement) },
          }),
        ),
      );
    }
  } catch (error) {
    console.error("leads ai status backfill", error);
  }

  const params = await searchParams;
  const period = parseLeadsPeriodParams(params);
  const listParams = parseLeadsListParams(params);
  const canManage = hasMinimumRole(user.role, "MANAGER");
  const isAdmin = hasMinimumRole(user.role, "ADMIN");

  if (isAdmin) {
    after(async () => {
      try {
        await maybeAutoSyncGoogleSheets(user.organizationId);
      } catch (error) {
        console.error("leads auto-sync", error);
      }
    });
  }

  const [periodStats, pipeMetrics, leadPage, teamMembers, sheetsConnection, workspaceTotal, serviceCatalog, organization] =
    await Promise.all([
      getLeadsMachineStatsForPeriod(user.organizationId, period),
      getLeadsPipeMetricsForPeriod(user.organizationId, period),
      listInboundLeadsForPeriodPaginated(user.organizationId, period, listParams),
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

  return (
    <div className="saas-page leads-machine-page">
      <TaskPageToolbar
        title="Leads"
        actions={
          <div className="leads-header-actions">
            <span className="leads-sync-pill" title={`Auto sync ${LEADS_SYNC_INTERVAL_LABEL}`}>
              {lastSyncLabel === "Not synced yet" ? "Not synced" : lastSyncLabel}
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
        organizationLogoUrl={organization?.logoUrl ?? null}
        organizationName={organization?.name ?? "Sheetomatic"}
        page={leadPage.page}
        period={period.type}
        periodLabel={period.periodLabel}
        sort={listParams.sort}
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
