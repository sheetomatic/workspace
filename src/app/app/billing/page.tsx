import Link from "next/link";
import { redirect } from "next/navigation";
import { PlatformBillingDashboard } from "@/components/saas/platform-billing-dashboard";
import { PageHeader } from "@/components/saas/page-header";
import "@/components/saas/client-billing.css";
import {
  catalogRateForWorkspace,
  resolveSoldProduct,
  SOLD_PRODUCT_LABELS,
} from "@/lib/billing/catalog";
import { formatBillingDate } from "@/lib/billing/dates";
import { extraUsers } from "@/lib/billing/prorata";
import { formatInrPaise } from "@/lib/billing/money";
import {
  getWorkspaceBillingSnapshot,
  listClientBillingRows,
  listPlatformInvoices,
  summarizeClientBilling,
} from "@/lib/billing/queries";
import { SHEETOMATIC_QUOTATION_ACCOUNT } from "@/lib/leads/seller-account";
import { hasMinimumRole } from "@/lib/permissions";
import { canManageSuperAdmins } from "@/lib/platform";
import { requireSession } from "@/lib/require-session";

export default async function WorkspaceBillingPage() {
  const user = await requireSession();
  if (!hasMinimumRole(user.role, "ADMIN")) {
    redirect("/app/settings");
  }

  if (canManageSuperAdmins(user, user.organizationSlug)) {
    const [rows, invoices] = await Promise.all([
      listClientBillingRows(),
      listPlatformInvoices(),
    ]);
    return (
      <PlatformBillingDashboard
        totals={summarizeClientBilling(rows)}
        invoices={invoices}
      />
    );
  }

  const org = await getWorkspaceBillingSnapshot(user.organizationId);
  if (!org) redirect("/app");

  const catalog = catalogRateForWorkspace(org);
  const productLabel = SOLD_PRODUCT_LABELS[resolveSoldProduct(org)];
  const monthly = org.billing?.monthlyRatePaise ?? catalog.monthlyRatePaise;
  const included = org.billing?.includedUsers ?? catalog.includedUsers;
  const extras = extraUsers(org.memberships.length, included);
  const renewal = org.organizationPlan?.renewalAt;
  const open = org.subscriptionInvoices.find(
    (row) => row.status === "SENT" || row.status === "OVERDUE" || row.status === "DRAFT",
  );

  return (
    <div className="saas-page ws-billing-page">
      <PageHeader
        title="Billing"
        description={`${productLabel} workspace — plan, users, invoices, and pay before renewal.`}
      />

      {org.status !== "ACTIVE" ? (
        <article className="saas-panel">
          <h3>Workspace paused</h3>
          <p>
            This workspace is {org.status.toLowerCase()} because an invoice is
            unpaid past the renewal date. Pay the open invoice below. Once
            Sheetomatic confirms the UTR, work starts again.
          </p>
        </article>
      ) : null}

      <div className="ws-billing-kpis">
        <div className="ws-billing-kpi ws-billing-kpi--clients">
          <span>Product</span>
          <strong>{productLabel}</strong>
        </div>
        <div className="ws-billing-kpi ws-billing-kpi--users">
          <span>Users</span>
          <strong>
            {org.memberships.length}/{org.maxMembers}
          </strong>
        </div>
        <div className="ws-billing-kpi ws-billing-kpi--invoiced">
          <span>Monthly (excl. GST)</span>
          <strong>{formatInrPaise(monthly)}</strong>
        </div>
        <div className="ws-billing-kpi ws-billing-kpi--pending">
          <span>Next renewal</span>
          <strong>{renewal ? formatBillingDate(renewal) : "—"}</strong>
        </div>
      </div>

      {extras > 0 ? (
        <article className="saas-panel">
          <p>
            {extras} extra user{extras === 1 ? "" : "s"} beyond {included} included
            seats. Extra seats and mid-cycle add-ons are billed prorata on the
            next invoice.
          </p>
        </article>
      ) : null}

      {open ? (
        <article className="saas-panel">
          <h3>Pay now</h3>
          <p>
            {open.number} · {formatInrPaise(open.totalPaise - open.paidPaise)} due{" "}
            {formatBillingDate(open.dueAt)}. After the due date the workspace
            stops until this is paid.
          </p>
          <p>
            UPI: <code>{SHEETOMATIC_QUOTATION_ACCOUNT.upiId}</code> ·{" "}
            {SHEETOMATIC_QUOTATION_ACCOUNT.bankName}{" "}
            {SHEETOMATIC_QUOTATION_ACCOUNT.accountNumber} /{" "}
            {SHEETOMATIC_QUOTATION_ACCOUNT.ifsc}
          </p>
          <Link className="btn-cta btn-primary" href={`/app/billing/invoices/${open.id}`}>
            Download invoice
          </Link>
        </article>
      ) : null}

      <article className="saas-panel">
        <h3>Invoices</h3>
        <div className="ws-billing-table-wrap">
          <table className="ws-billing-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Period</th>
                <th>Due</th>
                <th>Amount</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {org.subscriptionInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6}>No invoices yet. Sheetomatic will send the first one here.</td>
                </tr>
              ) : (
                org.subscriptionInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.number}</td>
                    <td>
                      {formatBillingDate(invoice.periodStart)} –{" "}
                      {formatBillingDate(invoice.periodEnd)}
                    </td>
                    <td>{formatBillingDate(invoice.dueAt)}</td>
                    <td>{formatInrPaise(invoice.totalPaise)}</td>
                    <td>
                      <span className={`ws-billing-pill ${invoice.status.toLowerCase()}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td>
                      <Link href={`/app/billing/invoices/${invoice.id}`}>Download</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}
