import Link from "next/link";
import { redirect } from "next/navigation";
import { ClientsBillingBoard } from "@/components/saas/clients-billing-board";
import { PageHeader } from "@/components/saas/page-header";
import "@/components/saas/client-billing.css";
import { SOLD_PRODUCT_LABELS, SOLD_PRODUCT_ORDER } from "@/lib/billing/catalog";
import { listClientBillingRows } from "@/lib/billing/queries";
import { ensureOnboardingTasks } from "@/lib/billing/invoices";
import { canManageSuperAdmins } from "@/lib/platform";
import { requireSession } from "@/lib/require-session";

export default async function ClientsBillingPage() {
  const user = await requireSession();
  if (!canManageSuperAdmins(user, user.organizationSlug)) {
    redirect("/app");
  }

  const rows = await listClientBillingRows();
  await Promise.all(rows.map((row) => ensureOnboardingTasks(row.id)));

  return (
    <div className="saas-page ws-billing-page">
      <PageHeader
        title="Clients & billing"
        description="One workspace per sold product — BCI, Tasks, HRMS, CRM, App Builder. Users, invoices, and hold stay on that workspace."
        actions={
          <Link className="btn-cta" href="/app/team">
            Create workspace
          </Link>
        }
      />
      <div className="ws-billing-kpis">
        {SOLD_PRODUCT_ORDER.filter((product) =>
          rows.some((row) => row.product === product),
        ).map((product) => (
          <div className="ws-billing-kpi" key={product}>
            <span>{SOLD_PRODUCT_LABELS[product]}</span>
            <strong>{rows.filter((row) => row.product === product).length}</strong>
          </div>
        ))}
        <div className="ws-billing-kpi">
          <span>Active users</span>
          <strong>{rows.reduce((sum, row) => sum + row.activeUsers, 0)}</strong>
        </div>
        <div className="ws-billing-kpi">
          <span>On hold / past due</span>
          <strong>
            {rows.filter((row) => row.status === "HOLD" || row.planStatus === "PAST_DUE").length}
          </strong>
        </div>
      </div>
      <ClientsBillingBoard rows={rows} />
    </div>
  );
}
