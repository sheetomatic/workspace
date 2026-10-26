import { CrmClientGroups, type CrmClientGroup } from "@/components/saas/crm-client-groups";
import { CrmSubmoduleShell } from "@/components/saas/crm-submodule-shell";
import "@/components/saas/leads-machine.css";
import { requireCrmSubModule } from "@/lib/crm/crm-access";
import { formatInr, leadCategoryLabel } from "@/lib/leads/categories";
import { buildLeadAiReengageMessage } from "@/lib/leads/ai-reengage-message";
import { listCrmNextTimeLeads, countCrmNextTimeLeads } from "@/lib/leads/crm-module-stats";
import Link from "next/link";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";

function leadValue(lead: {
  quotationValue: { toNumber(): number } | number | null;
  pipeValue: { toNumber(): number } | number | null;
}) {
  const raw = lead.quotationValue ?? lead.pipeValue;
  if (raw == null) {
    return 0;
  }
  return typeof raw === "number" ? raw : raw.toNumber();
}

function formatLeadDate(value: Date | null) {
  const date = value ?? null;
  if (!date) {
    return "—";
  }
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export default async function CrmNextTimePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requireSession(undefined, { module: "CRM" });
  await requireCrmSubModule(user, "nextTime");
  const canManage = hasMinimumRole(user.role, "MANAGER");
  const canSeeAllLeads =
    user.isSuperAdmin || hasMinimumRole(user.role, "ADMIN");
  const params = await searchParams;
  const total = await countCrmNextTimeLeads(user.organizationId, canSeeAllLeads ? undefined : user.id);
  const pages = Math.max(1, Math.ceil(total / 200));
  const page = Math.min(pages, Math.max(1, Math.floor(Number(params.page) || 1)));
  const rows = await listCrmNextTimeLeads(user.organizationId, {
    take: 200,
    skip: (page - 1) * 200,
    assignedToId: canSeeAllLeads ? undefined : user.id,
  });
  const totalValue = rows.reduce((sum, lead) => sum + leadValue(lead), 0);

  const groups: CrmClientGroup[] = rows.map((lead) => {
    const name = lead.name || lead.company || "Lead";
    const amount = leadValue(lead);
    const requirement = lead.requirement?.trim() || "No requirement noted";
    return {
      id: lead.id,
      name,
      phone: lead.phone || "",
      email: lead.email,
      inboundLeadId: lead.id,
      waMessage: buildLeadAiReengageMessage({
        name: lead.name,
        requirement: lead.requirement,
        category: lead.category,
        company: lead.company,
        campaign: lead.campaign,
        utmCampaign: lead.utmCampaign,
        utmContent: lead.utmContent,
        landingPage: lead.landingPage,
        channel: lead.channel,
        status: lead.status,
      }),
      summary: [
        leadCategoryLabel(lead.category),
        amount > 0 ? formatInr(amount) : null,
        lead.assignedTo?.name ?? null,
      ]
        .filter(Boolean)
        .join(" · "),
      rows: [
        {
          id: lead.id,
          cells: [
            lead.company?.trim() || "—",
            leadCategoryLabel(lead.category),
            {
              primary:
                requirement.length > 80
                  ? `${requirement.slice(0, 77)}…`
                  : requirement,
            },
            formatLeadDate(lead.modifiedAt ?? lead.capturedAt ?? lead.createdAt),
            amount > 0 ? formatInr(amount) : "—",
          ],
        },
      ],
    };
  });

  return (
    <CrmSubmoduleShell
      title="Next Time"
      description="Leads from before this month, plus parked leads. Original statuses, notes and payment history are unchanged."
      kpis={[
        { label: "Next Time leads", value: String(total), accent: "warning" },
        {
          label: "Quoted / pipe value (this page)",
          value: formatInr(totalValue),
          accent: "blue",
        },
      ]}
    >
      <nav aria-label="Next Time pages">
        {page > 1 && <Link href={`?page=${page - 1}`}>Previous</Link>}
        {" "}Page {page} of {pages} · {total} leads{" "}
        {page < pages && <Link href={`?page=${page + 1}`}>Next</Link>}
      </nav>
      <CrmClientGroups
        groups={groups}
        columns={["Company", "Category", "Requirement", "Last updated", "Value"]}
        openTab="details"
        waEvent="stage_follow_up"
        canManage={canManage}
        emptyMessage="No Next Time leads yet. Mark a lead as Next Time from the CRM drawer."
        filterPlaceholder="Filter Next Time leads…"
        noun="lead"
      />
    </CrmSubmoduleShell>
  );
}
