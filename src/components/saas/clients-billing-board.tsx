import Link from "next/link";
import type { WorkspaceProduct } from "@prisma/client";
import { ClientPlanActions } from "@/components/saas/client-plan-actions";
import { SOLD_PRODUCT_ORDER } from "@/lib/billing/catalog";
import type { listClientBillingRows } from "@/lib/billing/queries";

type Row = Awaited<ReturnType<typeof listClientBillingRows>>[number];

function statusClass(value: string) {
  return value.toLowerCase().replace(/\s+/g, "_");
}

export function ClientsBillingBoard({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <article className="saas-panel">
        <p>No client workspaces yet. Create one from Team → Super Admin panel.</p>
      </article>
    );
  }

  const groups = SOLD_PRODUCT_ORDER.map((product) => ({
    product,
    rows: rows.filter((row) => row.product === product),
  })).filter((group) => group.rows.length > 0);

  return (
    <div className="ws-billing-groups">
      {groups.map((group) => (
        <article className="saas-panel" key={group.product}>
          <div className="saas-panel-head">
            <div>
              <h3>
                {group.rows[0]?.productLabel ?? group.product}{" "}
                <span className="ws-billing-pill">{group.rows.length}</span>
              </h3>
              <p>
                One workspace per client. Add-On lets them take more services;
                each add-on bills at its plan rate on the next invoice.
              </p>
            </div>
          </div>
          <ProductTable rows={group.rows} />
        </article>
      ))}
    </div>
  );
}

function ProductTable({ rows }: { rows: Row[] }) {
  return (
    <div className="ws-billing-table-wrap">
      <table className="ws-billing-table">
        <thead>
          <tr>
            <th>Client</th>
            <th>Users</th>
            <th>Monthly / plan</th>
            <th>Invoiced</th>
            <th>Pending</th>
            <th>Received</th>
            <th>Renewal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <Link href={`/app/clients/${row.id}`}>{row.name}</Link>
                <div>
                  <code>{row.slug}</code>
                  {row.ownerEmail ? ` · ${row.ownerEmail}` : ""}
                </div>
                <span className={`ws-billing-pill ${statusClass(row.status)}`}>
                  {row.status}
                </span>{" "}
                <span className={`ws-billing-pill ${statusClass(row.planStatus)}`}>
                  {row.planStatus}
                </span>
              </td>
              <td>
                <strong>
                  {row.activeUsers}/{row.maxMembers}
                </strong>
              </td>
              <td>
                {row.monthlyTotalLabel}
                <div>{row.planLabel}</div>
                {row.addonLines.length > 0 ? (
                  <div className="ws-addon-summary">
                    incl. {row.addonLines.map((line) => line.label).join(", ")}
                  </div>
                ) : null}
                <ClientPlanActions
                  addonLines={row.addonLines}
                  availableAddons={row.availableAddons}
                  billingPeriod={row.billingPeriod}
                  clientName={row.name}
                  extraUserMonthlyPaise={row.extraUserMonthlyPaise}
                  gstPercent={row.gstPercent}
                  hasPlan={row.hasPlan}
                  includedUsers={row.includedUsers}
                  monthlyPaise={row.monthlyPaise}
                  organizationId={row.id}
                  renewalAt={
                    row.renewalAt ? row.renewalAt.toISOString().slice(0, 10) : ""
                  }
                />
              </td>
              <td>{row.invoicedLabel}</td>
              <td>
                {row.pendingLabel}
                {row.pendingInvoices > 0 ? (
                  <div>
                    {row.pendingInvoices} open
                    {row.latestInvoice ? ` · ${row.latestInvoice.number}` : ""}
                  </div>
                ) : null}
              </td>
              <td>{row.receivedLabel}</td>
              <td>{row.renewalLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function productCounts(rows: Row[]) {
  const counts = {} as Record<WorkspaceProduct, number>;
  for (const row of rows) {
    counts[row.product] = (counts[row.product] ?? 0) + 1;
  }
  return counts;
}
