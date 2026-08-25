import Link from "next/link";
import { ClientsBillingBoard } from "@/components/saas/clients-billing-board";
import { MonthlyServiceClientsPanel } from "@/components/saas/monthly-service-clients-panel";
import { PageHeader } from "@/components/saas/page-header";
import { WhatsAppApiClientsPanel } from "@/components/saas/whatsapp-api-clients-panel";
import type {
  MonthlyServiceAssigneeOption,
  MonthlyServiceClientRow,
} from "@/lib/billing/monthly-service-clients.shared";
import {
  summarizeClientBilling,
  type ClientBillingRow,
} from "@/lib/billing/queries";
import type { WhatsAppApiClientRow } from "@/lib/billing/whatsapp-api-clients.shared";
import {
  isMonthlyWhatsAppDuration,
  type WhatsAppApiPlanOption,
} from "@/lib/billing/whatsapp-api-plans";

export function ClientsBillingDashboard({
  rows,
  whatsappApiClients = [],
  whatsappApiPlans = [],
  monthlyServiceClients = [],
  monthlyServiceAssignees = [],
  title = "Clients",
}: {
  rows: ClientBillingRow[];
  whatsappApiClients?: WhatsAppApiClientRow[];
  whatsappApiPlans?: WhatsAppApiPlanOption[];
  monthlyServiceClients?: MonthlyServiceClientRow[];
  monthlyServiceAssignees?: MonthlyServiceAssigneeOption[];
  title?: string;
}) {
  const totals = summarizeClientBilling(rows);
  const waRegular = whatsappApiClients.filter((row) => row.accountGroup === "REGULAR");
  const waMonthly = waRegular.filter((row) => isMonthlyWhatsAppDuration(row.durationDays));
  const waDueSoon = waRegular.filter((row) => row.dueSoon).length;
  const monthlyWorkspaces = rows.filter((row) => row.billingPeriod === "MONTHLY").length;
  const monthlyServices = monthlyServiceClients.filter((row) => row.status !== "CANCELLED").length;

  return (
    <div className="saas-page ws-billing-page">
      <PageHeader
        title={title}
        description="Workspace clients, monthly services from leads (GWS training and more), and WhatsApp API recharge. Click a row for details. Invoices are on Billing."
        actions={
          <>
            <Link className="saas-ws-action" href="/app/billing">
              Billing
            </Link>
            <Link className="saas-ws-action" href="/app/team">
              Create workspace
            </Link>
          </>
        }
      />
      <div className="ws-billing-kpis">
        <div className="ws-billing-kpi ws-billing-kpi--clients">
          <span>Clients</span>
          <strong>{totals.clients}</strong>
        </div>
        <div className="ws-billing-kpi ws-billing-kpi--users">
          <span>Active users</span>
          <strong>{totals.activeUsers}</strong>
        </div>
        <div className="ws-billing-kpi ws-billing-kpi--hold">
          <span>On hold</span>
          <strong>{totals.onHold}</strong>
        </div>
        <div className="ws-billing-kpi ws-billing-kpi--invoiced">
          <span>Monthly</span>
          <strong>
            {monthlyWorkspaces + waMonthly.length + monthlyServices}
            <small>
              {monthlyServices} services · {waMonthly.length} WhatsApp ·{" "}
              {monthlyWorkspaces} workspace
            </small>
          </strong>
        </div>
        <div className="ws-billing-kpi ws-billing-kpi--wa">
          <span>WhatsApp API</span>
          <strong>
            {waRegular.length}
            <small>
              {waDueSoon} due in 10 days
            </small>
          </strong>
        </div>
      </div>
      <MonthlyServiceClientsPanel
        clients={monthlyServiceClients}
        assignees={monthlyServiceAssignees}
      />
      <WhatsAppApiClientsPanel
        clients={whatsappApiClients}
        plans={whatsappApiPlans}
      />
      <ClientsBillingBoard rows={rows} />
    </div>
  );
}
