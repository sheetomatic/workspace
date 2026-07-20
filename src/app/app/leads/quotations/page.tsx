import Link from "next/link";
import { CrmSubmoduleShell } from "@/components/saas/crm-submodule-shell";
import "@/components/saas/leads-machine.css";
import { formatInr } from "@/lib/leads/categories";
import { formatCrmNavValue } from "@/lib/leads/crm-nav-format";
import { listCrmQuotations } from "@/lib/leads/crm-module-stats";
import { requireSession } from "@/lib/require-session";
import { prisma } from "@/lib/db";

export default async function CrmQuotationsPage() {
  const user = await requireSession(undefined, { module: "CRM" });
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
      <div className="crm-submodule-table-wrap">
        <table className="crm-submodule-table">
          <thead>
            <tr>
              <th>Number</th>
              <th>Client</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="leads-machine-muted">
                  No quotations yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.quotationNumber}</strong>
                    {row.revisionNumber > 1 ? (
                      <div className="leads-machine-muted">
                        Rev {row.revisionNumber}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {row.lead.name || row.lead.company || "Lead"}
                    <div className="leads-machine-muted">
                      {row.lead.phone || "—"}
                    </div>
                  </td>
                  <td>{row.requestType === "INVOICE" ? "Invoice" : "Proposal"}</td>
                  <td>{formatInr(Number(row.totalAmount))}</td>
                  <td>
                    {new Date(row.quotationDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td>
                    {row.lockedAt
                      ? "Locked"
                      : row.sentAt
                        ? "Sent"
                        : row.status}
                  </td>
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
