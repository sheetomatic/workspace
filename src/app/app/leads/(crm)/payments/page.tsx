import { CrmClientGroups, type CrmClientGroup } from "@/components/saas/crm-client-groups";
import { CrmSubmoduleShell } from "@/components/saas/crm-submodule-shell";
import "@/components/saas/leads-machine.css";
import { formatInr } from "@/lib/leads/categories";
import { formatCrmNavValue } from "@/lib/leads/crm-nav-format";
import { listCrmPayments } from "@/lib/leads/crm-module-stats";
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

export default async function CrmPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await requireSession(undefined, { module: "CRM" });
  await requireCrmSubModule(user, "payments");
  const canManage = hasMinimumRole(user.role, "MANAGER");
  const period = parseCrmPeriod((await searchParams).period);
  const rows = await listCrmPayments(user.organizationId, 500);
  const ymds = rows.map((row) => istYmd(new Date(row.receivedDate)));
  const periodCounts = countCrmPeriods(ymds);
  const visible = rows.filter((row) =>
    ymdInCrmPeriod(istYmd(new Date(row.receivedDate)), period),
  );
  const value = visible.reduce((sum, row) => sum + Number(row.receivedAmount), 0);

  const byLead = new Map<
    string,
    {
      lead: (typeof visible)[number]["lead"];
      payments: typeof visible;
      total: number;
    }
  >();
  for (const row of visible) {
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
      description={`Receipts for ${crmPeriodLabel(period)}. Click a number to change the range.`}
      kpis={[
        ...crmPeriodKpis("/app/leads/payments", periodCounts, period),
        { label: "Received", value: formatCrmNavValue(value), accent: "success" },
        {
          label: "Avg receipt",
          value:
            visible.length > 0
              ? formatCrmNavValue(value / visible.length)
              : "₹0",
        },
      ]}
    >
      <CrmClientGroups
        groups={groups}
        columns={["Date", "Type", "Method", "Amount"]}
        openTab="payments"
        waEvent="alert_payment_pending"
        canManage={canManage}
        emptyMessage={`No payments ${crmPeriodLabel(period)}.`}
        filterPlaceholder="Filter payment clients…"
      />
    </CrmSubmoduleShell>
  );
}
