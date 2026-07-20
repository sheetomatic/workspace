import Link from "next/link";
import { CrmSubmoduleShell } from "@/components/saas/crm-submodule-shell";
import "@/components/saas/leads-machine.css";
import { formatInr } from "@/lib/leads/categories";
import { formatCrmNavValue } from "@/lib/leads/crm-nav-format";
import {
  listSalesOrders,
} from "@/lib/leads/sales-orders";
import {
  partitionSalesOrdersByLifecycle,
  salesOrderStatusLabel,
} from "@/lib/leads/sales-order-types";
import { getSalesOrderStats } from "@/lib/sales-orders/queries";
import { requireSession } from "@/lib/require-session";

export default async function CrmProjectsPage() {
  const user = await requireSession(undefined, { module: "CRM" });
  const [{ orders }, stats] = await Promise.all([
    listSalesOrders(user.organizationId, { limit: 150 }),
    getSalesOrderStats(user.organizationId),
  ]);
  const { running, delivered } = partitionSalesOrdersByLifecycle(orders);
  const pipelineValue = running.reduce(
    (sum, order) => sum + Number(order.orderValue || 0),
    0,
  );

  return (
    <CrmSubmoduleShell
      title="Projects"
      description="Sales orders as client projects — running and delivered over time."
      kpis={[
        { label: "Running", value: String(stats.inProgress), accent: "blue" },
        { label: "Delivered", value: String(stats.delivered), accent: "success" },
        { label: "Total", value: String(stats.total) },
        {
          label: "Running value",
          value: formatCrmNavValue(pipelineValue),
          accent: "warning",
        },
      ]}
    >
      <div className="crm-projects-sections">
        <section>
          <h3>Running ({running.length})</h3>
          <ProjectTable rows={running} empty="No running projects." />
        </section>
        <section>
          <h3>Delivered ({delivered.length})</h3>
          <ProjectTable rows={delivered} empty="No delivered projects yet." />
        </section>
      </div>
      <p className="leads-machine-muted crm-submodule-footnote">
        Full ops queue also lives in{" "}
        <Link href="/app/sales-orders">Sales orders</Link>.
      </p>
    </CrmSubmoduleShell>
  );
}

function ProjectTable({
  rows,
  empty,
}: {
  rows: Awaited<ReturnType<typeof listSalesOrders>>["orders"];
  empty: string;
}) {
  return (
    <div className="crm-submodule-table-wrap">
      <table className="crm-submodule-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Client</th>
            <th>Status</th>
            <th>Value</th>
            <th>Created</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="leads-machine-muted">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((order) => (
              <tr key={order.id}>
                <td>
                  <strong>{order.orderNumber}</strong>
                </td>
                <td>
                  {order.lead.name || order.lead.company || "Client"}
                  <div className="leads-machine-muted">
                    {order.lead.phone || "—"}
                  </div>
                </td>
                <td>{salesOrderStatusLabel(order.status)}</td>
                <td>{formatInr(Number(order.orderValue))}</td>
                <td>
                  {new Date(order.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td>
                  <Link
                    className="btn-secondary btn-sm"
                    href={`/app/leads?leadId=${order.lead.id}&period=all`}
                  >
                    Open CRM
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
