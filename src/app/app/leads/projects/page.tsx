import Link from "next/link";
import { CrmClientGroups, type CrmClientGroup } from "@/components/saas/crm-client-groups";
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
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";

function groupProjectsByLead(
  rows: SalesOrderListItem[],
  paymentByLead: Map<string, number>,
  sectionKey: string,
): CrmClientGroup[] {
  const byLead = new Map<
    string,
    {
      lead: SalesOrderListItem["lead"];
      orders: SalesOrderListItem[];
      value: number;
      received: number;
      due: number;
    }
  >();

  for (const order of rows) {
    const value = Number(order.orderValue || 0);
    const received = paymentByLead.get(order.lead.id) ?? 0;
    const due = Math.max(0, Math.round((value - received) * 100) / 100);
    const existing = byLead.get(order.lead.id);
    if (existing) {
      existing.orders.push(order);
      existing.value += value;
      existing.due = Math.max(0, Math.round((existing.value - existing.received) * 100) / 100);
    } else {
      byLead.set(order.lead.id, {
        lead: order.lead,
        orders: [order],
        value,
        received,
        due,
      });
    }
  }

  return [...byLead.values()].map((entry) => {
    const name = entry.lead.name || entry.lead.company || "Client";
    const dueLabel =
      entry.due > 0 ? ` · due ${formatInr(entry.due)}` : "";
    return {
      id: `${sectionKey}-${entry.lead.id}`,
      name,
      phone: entry.lead.phone || "",
      inboundLeadId: entry.lead.id,
      summary: `${entry.orders.length} order${
        entry.orders.length === 1 ? "" : "s"
      } · ${formatInr(entry.value)}${dueLabel}`,
      meta:
        entry.received > 0 ? `received ${formatInr(entry.received)}` : undefined,
      waEvent: entry.due > 0 ? "alert_payment_pending" : "stage_follow_up",
      rows: entry.orders.map((order) => {
        const value = Number(order.orderValue || 0);
        const received = paymentByLead.get(order.lead.id) ?? 0;
        const due = Math.max(0, Math.round((value - received) * 100) / 100);
        return {
          id: order.id,
          cells: [
            { primary: order.orderNumber },
            salesOrderStatusLabel(order.status),
            formatInr(value),
            {
              primary: received > 0 ? formatInr(received) : "—",
              className: received > 0 ? "crm-projects-received" : undefined,
            },
            {
              primary: formatInr(due),
              className: due > 0 ? "crm-projects-due" : undefined,
            },
            new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          ],
        };
      }),
    };
  });
}

export default async function CrmProjectsPage() {
  const user = await requireSession(undefined, { module: "CRM" });
  const canManage = hasMinimumRole(user.role, "MANAGER");
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

  const runningGroups = groupProjectsByLead(running, paymentByLead, "running");
  const deliveredGroups = groupProjectsByLead(
    delivered,
    paymentByLead,
    "delivered",
  );

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
          <CrmClientGroups
            groups={runningGroups}
            columns={[
              "Order",
              "Status",
              "Value",
              "Received",
              "Due",
              "Created",
            ]}
            openTab="projects"
            waEvent="stage_follow_up"
            canManage={canManage}
            emptyMessage="No running projects."
            filterPlaceholder="Filter running clients…"
            noun="client"
          />
        </section>
        <section>
          <h3>Delivered ({delivered.length})</h3>
          <CrmClientGroups
            groups={deliveredGroups}
            columns={[
              "Order",
              "Status",
              "Value",
              "Received",
              "Due",
              "Created",
            ]}
            openTab="projects"
            waEvent="stage_follow_up"
            canManage={canManage}
            emptyMessage="No delivered projects yet."
            filterPlaceholder="Filter delivered clients…"
            noun="client"
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
