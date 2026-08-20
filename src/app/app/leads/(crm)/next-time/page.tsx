import { CrmClientGroups, type CrmClientGroup } from "@/components/saas/crm-client-groups";
import { CrmSubmoduleShell } from "@/components/saas/crm-submodule-shell";
import "@/components/saas/leads-machine.css";
import { requireCrmSubModule } from "@/lib/crm/crm-access";
import { formatInr, leadCategoryLabel } from "@/lib/leads/categories";
import { listCrmNextTimeLeads } from "@/lib/leads/crm-module-stats";
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

export default async function CrmNextTimePage() {
  const user = await requireSession(undefined, { module: "CRM" });
  await requireCrmSubModule(user, "nextTime");
  const canManage = hasMinimumRole(user.role, "MANAGER");
  const canSeeAllLeads =
    user.isSuperAdmin || hasMinimumRole(user.role, "ADMIN");
  const rows = await listCrmNextTimeLeads(user.organizationId, {
    take: 200,
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
      description="Parked leads to revisit later. They stay out of the Leads list until you move the status back."
      kpis={[
        { label: "Parked", value: String(rows.length), accent: "warning" },
        {
          label: "Quoted / pipe value",
          value: formatInr(totalValue),
          accent: "blue",
        },
      ]}
    >
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
