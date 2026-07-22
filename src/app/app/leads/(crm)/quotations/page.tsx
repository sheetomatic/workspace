import { CrmClientGroups, type CrmClientGroup } from "@/components/saas/crm-client-groups";
import { CrmSubmoduleShell } from "@/components/saas/crm-submodule-shell";
import "@/components/saas/leads-machine.css";
import { formatInr } from "@/lib/leads/categories";
import { formatCrmNavValue } from "@/lib/leads/crm-nav-format";
import { listCrmQuotations } from "@/lib/leads/crm-module-stats";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";
import { prisma } from "@/lib/db";

export default async function CrmQuotationsPage() {
  const user = await requireSession(undefined, { module: "CRM" });
  const canManage = hasMinimumRole(user.role, "MANAGER");
  const [rows, agg] = await Promise.all([
    listCrmQuotations(user.organizationId, 150),
    prisma.inboundLeadQuotation.aggregate({
      where: { organizationId: user.organizationId },
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),
  ]);
  const sent = rows.filter((r) => r.sentAt || r.status === "SENT").length;
  const locked = rows.filter((r) => r.lockedAt).length;
  const value = Number(agg._sum.totalAmount ?? 0);

  const byLead = new Map<
    string,
    {
      lead: (typeof rows)[number]["lead"];
      quotations: typeof rows;
      total: number;
    }
  >();
  for (const row of rows) {
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
      description="All proposals and invoices with count and value."
      kpis={[
        { label: "Count", value: String(agg._count._all), accent: "blue" },
        { label: "Value", value: formatCrmNavValue(value), accent: "success" },
        { label: "Sent (page)", value: String(sent) },
        { label: "Locked (page)", value: String(locked), accent: "warning" },
      ]}
    >
      <CrmClientGroups
        groups={groups}
        columns={["Number", "Type", "Amount", "Date", "Status"]}
        openTab="quote"
        waEvent="alert_quotation_pending"
        canManage={canManage}
        emptyMessage="No quotations yet."
        filterPlaceholder="Filter quotation clients…"
      />
    </CrmSubmoduleShell>
  );
}
