import Link from "next/link";
import { CrmSubmoduleShell } from "@/components/saas/crm-submodule-shell";
import "@/components/saas/leads-machine.css";
import { formatInr } from "@/lib/leads/categories";
import { formatCrmNavValue } from "@/lib/leads/crm-nav-format";
import { listCrmPayments } from "@/lib/leads/crm-module-stats";
import { requireSession } from "@/lib/require-session";
import { prisma } from "@/lib/db";

export default async function CrmPaymentsPage() {
  const user = await requireSession(undefined, { module: "CRM" });
  const [rows, agg] = await Promise.all([
    listCrmPayments(user.organizationId, 150),
    prisma.inboundLeadPayment.aggregate({
      where: { organizationId: user.organizationId },
      _count: { _all: true },
      _sum: { receivedAmount: true },
    }),
  ]);
  const value = Number(agg._sum.receivedAmount ?? 0);

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
          label: "On this page",
          value: String(rows.length),
        },
      ]}
    >
      <div className="crm-submodule-table-wrap">
        <table className="crm-submodule-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Client</th>
              <th>Type</th>
              <th>Method</th>
              <th>Amount</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="leads-machine-muted">
                  No payments recorded yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {new Date(row.receivedDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td>
                    <strong>{row.lead.name || row.lead.company || "Lead"}</strong>
                    <div className="leads-machine-muted">
                      {row.lead.phone || "—"}
                    </div>
                  </td>
                  <td>{row.paymentType.replaceAll("_", " ")}</td>
                  <td>{row.paymentMethod.replaceAll("_", " ")}</td>
                  <td>{formatInr(Number(row.receivedAmount))}</td>
                  <td>
                    <Link
                      className="btn-secondary btn-sm"
                      href={`/app/leads?leadId=${row.lead.id}&period=all`}
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </CrmSubmoduleShell>
  );
}
