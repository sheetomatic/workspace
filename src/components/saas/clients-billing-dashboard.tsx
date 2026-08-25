import Link from "next/link";
import { ClientsBillingBoard } from "@/components/saas/clients-billing-board";
import { PageHeader } from "@/components/saas/page-header";
import { formatInrPaise } from "@/lib/billing/money";
import {
  summarizeClientBilling,
  type ClientBillingRow,
} from "@/lib/billing/queries";

export function ClientsBillingDashboard({
  rows,
  title = "Clients & billing",
}: {
  rows: ClientBillingRow[];
  title?: string;
}) {
  const totals = summarizeClientBilling(rows);

  return (
    <div className="saas-page ws-billing-page">
      <PageHeader
        title={title}
        description="Client workspaces only — active users, invoices, pending, and received. Sheetomatic Technologies is not billed here."
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
      </div>
      <ClientsBillingBoard rows={rows} />
    </div>
  );
}
