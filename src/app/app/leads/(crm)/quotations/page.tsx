import { CrmClientGroups, type CrmClientGroup } from "@/components/saas/crm-client-groups";
import { CrmSubmoduleShell } from "@/components/saas/crm-submodule-shell";
import "@/components/saas/leads-machine.css";
import { formatInr } from "@/lib/leads/categories";
import { formatCrmNavValue } from "@/lib/leads/crm-nav-format";
import { listCrmQuotations } from "@/lib/leads/crm-module-stats";
import { istYmd } from "@/lib/leads/crm-meetings";
import {
  countCrmPeriods,
  crmPeriodKpis,
  crmPeriodLabel,
  parseCrmPeriod,
  ymdInCrmPeriod,
} from "@/lib/leads/crm-period";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";
import { requireCrmSubModule } from "@/lib/crm/crm-access";

export default async function CrmQuotationsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await requireSession(undefined, { module: "CRM" });
  await requireCrmSubModule(user, "quotations");
  const canManage = hasMinimumRole(user.role, "MANAGER");
  const period = parseCrmPeriod((await searchParams).period);
  const rows = await listCrmQuotations(user.organizationId, 500);
  const ymds = rows.map((row) => istYmd(new Date(row.quotationDate)));
  const periodCounts = countCrmPeriods(ymds);
  const visible = rows.filter((row) =>
    ymdInCrmPeriod(istYmd(new Date(row.quotationDate)), period),
  );
  const sent = visible.filter((r) => r.sentAt || r.status === "SENT").length;
  const locked = visible.filter((r) => r.lockedAt).length;
  const value = visible.reduce((sum, row) => sum + Number(row.totalAmount), 0);

  const byLead = new Map<
    string,
    {
      lead: (typeof visible)[number]["lead"];
      quotations: typeof visible;
      total: number;
    }
  >();
  for (const row of visible) {
    const existing = byLead.get(row.lead.id);
    const amount = Number(row.totalAmount);
    if (existing) {
      existing.quotations.push(row);
      existing.total += amount;
    } else {
      byLead.set(row.lead.id, {
        lead: row.lead,
        quotations: [row],
        total: amount,
      });
    }
  }

  const groups: CrmClientGroup[] = [...byLead.values()].map((entry) => {
    const name = entry.lead.name || entry.lead.company || "Lead";
    return {
      id: entry.lead.id,
      name,
      phone: entry.lead.phone || "",
      inboundLeadId: entry.lead.id,
      summary: `${entry.quotations.length} quote${
        entry.quotations.length === 1 ? "" : "s"
      } · ${formatInr(entry.total)}`,
      rows: entry.quotations.map((row) => ({
        id: row.id,
        cells: [
          {
            primary: row.quotationNumber,
            secondary:
              row.revisionNumber > 1 ? `Rev ${row.revisionNumber}` : undefined,
          },
          row.requestType === "INVOICE" ? "Invoice" : "Proposal",
          formatInr(Number(row.totalAmount)),
          new Date(row.quotationDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          row.lockedAt ? "Locked" : row.sentAt ? "Sent" : row.status,
        ],
      })),
    };
  });

  return (
    <CrmSubmoduleShell
      title="Quotations"
      description={`Proposals and invoices for ${crmPeriodLabel(period)}. Click a number to change the range.`}
      kpis={[
        ...crmPeriodKpis("/app/leads/quotations", periodCounts, period),
        { label: "Value", value: formatCrmNavValue(value), accent: "success" },
        { label: "Sent", value: String(sent) },
        { label: "Locked", value: String(locked), accent: "warning" },
      ]}
    >
      <CrmClientGroups
        groups={groups}
        columns={["Number", "Type", "Amount", "Date", "Status"]}
        openTab="quote"
        waEvent="alert_quotation_pending"
        canManage={canManage}
        emptyMessage={`No quotations ${crmPeriodLabel(period)}.`}
        filterPlaceholder="Filter quotation clients…"
      />
    </CrmSubmoduleShell>
  );
}
