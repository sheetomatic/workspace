import Link from "next/link";
import { ClientsBillingBoard } from "@/components/saas/clients-billing-board";
import { PageHeader } from "@/components/saas/page-header";
import { WhatsAppApiClientsPanel } from "@/components/saas/whatsapp-api-clients-panel";
import { formatInrPaise } from "@/lib/billing/money";
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
  title = "Clients & billing",
}: {
  rows: ClientBillingRow[];
  whatsappApiClients?: WhatsAppApiClientRow[];
  whatsappApiPlans?: WhatsAppApiPlanOption[];
  title?: string;
}) {
  const totals = summarizeClientBilling(rows);
  const waDueSoon = whatsappApiClients.filter((row) => row.dueSoon).length;

  return (
    <div className="saas-page ws-billing-page">
      <PageHeader
        title={title}
        description="Workspace clients plus WhatsApp API recharge clients. Reminders go out before each plan expires. Sheetomatic Technologies is not billed here."
        actions={
          <Link className="btn-cta" href="/app/team">
            Create workspace
          </Link>
        }
      />
      <div className="ws-billing-kpis">
        <div className="ws-billing-kpi">
          <span>Clients</span>
          <strong>{totals.clients}</strong>
        </div>
        <div className="ws-billing-kpi">
          <span>Active users</span>
          <strong>{totals.activeUsers}</strong>
        </div>
        <div className="ws-billing-kpi">
          <span>Invoiced</span>
          <strong>{formatInrPaise(totals.invoicedPaise)}</strong>
        </div>
        <div className="ws-billing-kpi">
          <span>Pending</span>
          <strong>
            {formatInrPaise(totals.pendingPaise)}
            <small>
              {totals.pendingInvoices} invoice{totals.pendingInvoices === 1 ? "" : "s"}
            </small>
          </strong>
        </div>
        <div className="ws-billing-kpi">
          <span>Received</span>
          <strong>{formatInrPaise(totals.receivedPaise)}</strong>
        </div>
        <div className="ws-billing-kpi">
          <span>On hold</span>
          <strong>{totals.onHold}</strong>
        </div>
        <div className="ws-billing-kpi">
          <span>WhatsApp API</span>
          <strong>
            {whatsappApiClients.length}
            <small>
              {waDueSoon} due in 7 days
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
