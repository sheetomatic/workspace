import Link from "next/link";
import { CrmSubmoduleShell } from "@/components/saas/crm-submodule-shell";
import "@/components/saas/leads-machine.css";
import { formatInr } from "@/lib/leads/categories";
import { formatCrmNavValue } from "@/lib/leads/crm-nav-format";
import { getLeadPaymentTotalsByLeadIds } from "@/lib/leads/payment-totals";
import { listSalesOrders } from "@/lib/leads/sales-orders";
import {
  partitionSalesOrdersByLifecycle,
  salesOrderStatusLabel,
  type SalesOrderListItem,
} from "@/lib/leads/sales-order-types";
import { getSalesOrderStats } from "@/lib/sales-orders/queries";
import { requireSession } from "@/lib/require-session";

export default async function CrmProjectsPage() {
  const user = await requireSession(undefined, { module: "CRM" });
  const [{ orders }, stats] = await Promise.all([
    listSalesOrders(user.organizationId, { limit: 150 }),
    getSalesOrderStats(user.organizationId),
  ]);
  const paymentByLead = await getLeadPaymentTotalsByLeadIds(
    user.organizationId,
    orders.map((order) => order.lead.id),
  );
  const { running, delivered } = partitionSalesOrdersByLifecycle(orders);
  const pipelineValue = running.reduce(
    (sum, order) => sum + Number(order.orderValue || 0),
    0,
  );
  const receivedOnProjects = orders.reduce((sum, order) => {
    return sum + (paymentByLead.get(order.lead.id) ?? 0);
  }, 0);

  return (
    <CrmSubmoduleShell
      title="Projects"
      description="Sales orders as client projects — value, payments received, and due."
      kpis={[
        { label: "Running", value: String(stats.inProgress), accent: "blue" },
        { label: "Delivered", value: String(stats.delivered), accent: "success" },
        {
          label: "Received",
          value: formatCrmNavValue(receivedOnProjects),
          accent: "success",
        },
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
          <ProjectTable
            rows={running}
            paymentByLead={paymentByLead}
            empty="No running projects."
          />
        </section>
        <section>
          <h3>Delivered ({delivered.length})</h3>
          <ProjectTable
            rows={delivered}
            paymentByLead={paymentByLead}
            empty="No delivered projects yet."
          />
        </section>
      </div>
      <p className="leads-machine-muted crm-submodule-footnote">
        Payments come from CRM Payment records on the lead. Full ops queue also
        lives in <Link href="/app/sales-orders">Sales orders</Link>.
      </p>
    </CrmSubmoduleShell>
  );
}

function ProjectTable({
  rows,
  paymentByLead,
  empty,
}: {
  rows: SalesOrderListItem[];
  paymentByLead: Map<string, number>;
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
            <th>Received</th>
            <th>Due</th>
            <th>Created</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="leads-machine-muted">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((order) => {
              const value = Number(order.orderValue || 0);
              const received = paymentByLead.get(order.lead.id) ?? 0;
              const due = Math.max(0, Math.round((value - received) * 100) / 100);
              return (
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
                  <td>{formatInr(value)}</td>
                  <td className={received > 0 ? "crm-projects-received" : undefined}>
                    {received > 0 ? formatInr(received) : "—"}
                  </td>
                  <td className={due > 0 ? "crm-projects-due" : undefined}>
                    {formatInr(due)}
                  </td>
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
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
