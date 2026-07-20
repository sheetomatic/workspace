import { CrmClientGroups, type CrmClientGroup } from "@/components/saas/crm-client-groups";
import { CrmSubmoduleShell } from "@/components/saas/crm-submodule-shell";
import "@/components/saas/leads-machine.css";
import { formatInr } from "@/lib/leads/categories";
import { formatCrmNavValue } from "@/lib/leads/crm-nav-format";
import { listCrmPayments } from "@/lib/leads/crm-module-stats";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";
import { prisma } from "@/lib/db";

export default async function CrmPaymentsPage() {
  const user = await requireSession(undefined, { module: "CRM" });
  const canManage = hasMinimumRole(user.role, "MANAGER");
  const [rows, agg] = await Promise.all([
    listCrmPayments(user.organizationId, 150),
    prisma.inboundLeadPayment.aggregate({
      where: { organizationId: user.organizationId },
      _count: { _all: true },
      _sum: { receivedAmount: true },
    }),
  ]);
  const value = Number(agg._sum.receivedAmount ?? 0);

  const byLead = new Map<
    string,
    {
      lead: (typeof rows)[number]["lead"];
      payments: typeof rows;
      total: number;
    }
  >();
  for (const row of rows) {
    const existing = byLead.get(row.lead.id);
    const amount = Number(row.receivedAmount);
    if (existing) {
      existing.payments.push(row);
      existing.total += amount;
    } else {
      byLead.set(row.lead.id, {
        lead: row.lead,
        payments: [row],
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
      summary: `${entry.payments.length} receipt${
        entry.payments.length === 1 ? "" : "s"
      } · ${formatInr(entry.total)}`,
      rows: entry.payments.map((row) => ({
        id: row.id,
        cells: [
          {
            primary: new Date(row.receivedDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          },
          row.paymentType.replaceAll("_", " "),
          row.paymentMethod.replaceAll("_", " "),
          formatInr(Number(row.receivedAmount)),
        ],
      })),
    };
  });

  return (
    <CrmSubmoduleShell
      title="Payments"
      description="Received payments across all CRM clients — count and value."
      kpis={[
        { label: "Receipts", value: String(agg._count._all), accent: "blue" },
        { label: "Received value", value: formatCrmNavValue(value), accent: "success" },
        {
          label: "Avg receipt",
          value:
            agg._count._all > 0
              ? formatCrmNavValue(value / agg._count._all)
              : "₹0",
        },
        {
          label: "Clients on page",
          value: String(groups.length),
        },
      ]}
    >
      <CrmClientGroups
        groups={groups}
        columns={["Date", "Type", "Method", "Amount"]}
        openTab="payments"
        waEvent="alert_payment_pending"
        canManage={canManage}
        emptyMessage="No payments recorded yet."
        filterPlaceholder="Filter payment clients…"
      />
    </CrmSubmoduleShell>
  );
}
