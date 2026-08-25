import Link from "next/link";
import { ClientsBillingBoard } from "@/components/saas/clients-billing-board";
import { PageHeader } from "@/components/saas/page-header";
import { WhatsAppApiClientsPanel } from "@/components/saas/whatsapp-api-clients-panel";
import {
  summarizeClientBilling,
  type ClientBillingRow,
} from "@/lib/billing/queries";
import type { WhatsAppApiClientRow } from "@/lib/billing/whatsapp-api-clients.shared";
import type { WhatsAppApiPlanOption } from "@/lib/billing/whatsapp-api-plans";

export function ClientsBillingDashboard({
  rows,
  whatsappApiClients = [],
  whatsappApiPlans = [],
  title = "Clients",
}: {
  rows: ClientBillingRow[];
  whatsappApiClients?: WhatsAppApiClientRow[];
  whatsappApiPlans?: WhatsAppApiPlanOption[];
  title?: string;
}) {
  const totals = summarizeClientBilling(rows);
  const waRegular = whatsappApiClients.filter((row) => row.accountGroup === "REGULAR");
  const waDueSoon = waRegular.filter((row) => row.dueSoon).length;

  return (
    <div className="saas-page ws-billing-page">
      <PageHeader
        title={title}
        description="Workspace clients and WhatsApp API recharge clients. Click a row for details. Invoices and collections are on Billing. Sheetomatic Technologies is not listed here."
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
      <WhatsAppApiClientsPanel
        clients={whatsappApiClients}
        plans={whatsappApiPlans}
      />
      <ClientsBillingBoard rows={rows} />
    </div>
  );
}
