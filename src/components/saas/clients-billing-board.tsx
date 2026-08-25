import Link from "next/link";
import type { WorkspaceProduct } from "@prisma/client";
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
                One workspace per client for this product. Users, monthly rate,
                renewal, and onboarding stay on that workspace.
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
            <th>Plan / month</th>
            <th>Renewal</th>
            <th>Invoice</th>
            <th>Onboarding</th>
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
                {row.monthlyLabel}
                <div>{row.planLabel}</div>
              </td>
              <td>{row.renewalLabel}</td>
              <td>
                {row.latestInvoice ? (
                  <>
                    <span className={`ws-billing-pill ${statusClass(row.latestInvoice.status)}`}>
                      {row.latestInvoice.status}
                    </span>
                    <div>
                      {row.latestInvoice.number} · {row.latestInvoice.totalLabel}
                    </div>
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td>{row.onboarding.percent}%</td>
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
