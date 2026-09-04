import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ClientBillingRatesForm,
  GenerateInvoiceForm,
  InvoiceOpsForm,
  OnboardingChecklistForm,
} from "@/components/saas/client-billing-forms";
import { PageHeader } from "@/components/saas/page-header";
import "@/components/saas/client-billing.css";
import {
  catalogRateForWorkspace,
  extraAddonMonthlyPaise,
  resolveSoldProduct,
  SOLD_PRODUCT_LABELS,
  workspaceAddonCharges,
} from "@/lib/billing/catalog";
import { formatBillingDate } from "@/lib/billing/dates";
import {
  ensureOnboardingTasks,
  ensureOrganizationBilling,
} from "@/lib/billing/invoices";
import { formatInrPaise, paiseToRupees } from "@/lib/billing/money";
import { onboardingProgress } from "@/lib/billing/checklist";
import { getClientBillingDetail } from "@/lib/billing/queries";
import { ORG_PLAN_LABELS } from "@/lib/org-plan-presets";
import { canManageSuperAdmins } from "@/lib/platform";
import { requireSession } from "@/lib/require-session";
import { tenantPortalOrigin } from "@/lib/workspace-auth-links";
import { kitInvoiceCharges, listShippableFmsKits } from "@/lib/addons/licensed-kits";
import {
  cancelKitLicenseAction,
  grantKitLicenseAction,
} from "@/app/app/fms/kits/actions";

export default async function ClientBillingDetailPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const user = await requireSession();
  if (!canManageSuperAdmins(user, user.organizationSlug)) {
    redirect("/app");
  }

  const { organizationId } = await params;
  const org = await getClientBillingDetail(organizationId);
  if (!org || org.isPrimary) notFound();

  await ensureOnboardingTasks(org.id);
  const billing = await ensureOrganizationBilling(org);
  const detail = await getClientBillingDetail(organizationId);
  if (!detail) notFound();

  const catalog = catalogRateForWorkspace(detail);
  const addonOverrides = detail.addonBillings.map((row) => ({
    module: row.module,
    ratePaise: row.ratePaise,
    billingPeriod: row.billingPeriod,
  }));
  const orgBillingPeriod = detail.organizationPlan?.billingPeriod ?? detail.billingPeriod;
  const addonCharges = workspaceAddonCharges(
    detail.allowedModules,
    detail.plan,
    detail.product,
    addonOverrides,
    orgBillingPeriod,
  );
  const kitCharges = kitInvoiceCharges(detail.licensedKits ?? [], orgBillingPeriod);
  const shippableKits = listShippableFmsKits();
  const progress = onboardingProgress(detail.onboardingTasks);
  const renewal = detail.organizationPlan?.renewalAt;
  const renewalInput = renewal ? renewal.toISOString().slice(0, 10) : "";

  return (
    <div className="saas-page ws-billing-page">
      <PageHeader
        title={detail.name}
        description={`${SOLD_PRODUCT_LABELS[resolveSoldProduct(detail)]} · ${ORG_PLAN_LABELS[detail.plan] ?? detail.plan} · ${detail.memberships.length} users · ${progress.percent}% onboarded`}
        actions={
          <Link className="btn-cta" href="/app/clients">
            All clients
          </Link>
        }
      />

      <div className="ws-billing-kpis">
        <div className="ws-billing-kpi ws-billing-kpi--clients">
          <span>Status</span>
          <strong>{detail.status}</strong>
        </div>
        <div className="ws-billing-kpi ws-billing-kpi--users">
          <span>Active users</span>
          <strong>
            {detail.memberships.length}/{detail.maxMembers}
          </strong>
        </div>
        <div className="ws-billing-kpi ws-billing-kpi--invoiced">
          <span>Monthly (excl. GST)</span>
          <strong>
            {formatInrPaise(
              (billing.monthlyRatePaise || catalog.monthlyRatePaise) +
                extraAddonMonthlyPaise(
                  detail.allowedModules,
                  detail.plan,
                  detail.product,
                  addonOverrides,
                  orgBillingPeriod,
                ) +
                kitCharges.reduce((sum, row) => sum + row.amountPaise, 0),
            )}
          </strong>
        </div>
        <div className="ws-billing-kpi ws-billing-kpi--pending">
          <span>Renewal</span>
          <strong>{renewal ? formatBillingDate(renewal) : "Not set"}</strong>
        </div>
      </div>

      <article className="saas-panel">
        <h3>Onboarding checklist</h3>
        <p className="saas-panel-lead">
          Track go-live for this tenant. Portal:{" "}
          <a href={`${tenantPortalOrigin(detail.slug)}/login`} rel="noreferrer" target="_blank">
            {detail.slug}.sheetomatic.com
          </a>
        </p>
        <OnboardingChecklistForm
          organizationId={detail.id}
          tasks={detail.onboardingTasks}
        />
      </article>

      <article className="saas-panel">
        <h3>Subscription rates</h3>
        <p className="saas-panel-lead">
          List prices come from /pricing. Override here for the sold deal. Extra
          users and mid-cycle changes bill prorata plus add-on charges. Use
          Add-On on the clients board to attach more services.
        </p>
        {addonCharges.length > 0 ? (
          <ul className="ws-addon-lines">
            {addonCharges.map((line) => (
              <li key={line.module}>
                <span>
                  {line.label}
                  {line.ratePaise > 0
                    ? ` · ${formatInrPaise(line.ratePaise)} / ${line.billingPeriod === "ANNUAL" ? "year" : "month"}`
                    : " · quote"}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <ClientBillingRatesForm
          organizationId={detail.id}
          monthlyRatePaise={billing.monthlyRatePaise}
          extraUserMonthlyPaise={billing.extraUserMonthlyPaise}
          includedUsers={billing.includedUsers}
          gstPercent={billing.gstPercent}
          billingEmail={billing.billingEmail ?? ""}
          billingName={billing.billingName ?? ""}
          gstin={billing.gstin ?? ""}
          notes={billing.notes ?? ""}
          billingPeriod={detail.organizationPlan?.billingPeriod ?? detail.billingPeriod}
          renewalAt={renewalInput}
        />
      </article>

      <article className="saas-panel">
        <h3>Licensed FMS kits</h3>
        <p className="saas-panel-lead">
          Org-wide right to use. Grant after UTR, or before if you trust the
          client. Next invoice picks up requested and active kits.
        </p>
        <ul className="ws-addon-lines">
          {shippableKits.map((kit) => {
            const row = (detail.licensedKits ?? []).find((item) => item.kitKey === kit.key);
            return (
              <li key={kit.key}>
                <span>
                  {kit.shortName}
                  {row ? ` · ${row.status.toLowerCase()}` : " · not licensed"}
                </span>
                {row?.status === "ACTIVE" ? (
                  <form action={cancelKitLicenseAction}>
                    <input name="organizationId" type="hidden" value={detail.id} />
                    <input name="kitKey" type="hidden" value={kit.key} />
                    <button className="ws-client-action" type="submit">
                      Cancel license
                    </button>
                  </form>
                ) : (
                  <form action={grantKitLicenseAction}>
                    <input name="organizationId" type="hidden" value={detail.id} />
                    <input name="kitKey" type="hidden" value={kit.key} />
                    <button className="ws-client-action ws-client-action--primary" type="submit">
                      Activate license
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </article>

      <article className="saas-panel">
        <h3>Invoices</h3>
        <GenerateInvoiceForm organizationId={detail.id} />
        <div className="ws-billing-table-wrap" style={{ marginTop: "1rem" }}>
          <table className="ws-billing-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Period</th>
                <th>Due</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {detail.subscriptionInvoices.map((invoice) => {
                const balance = Math.max(0, invoice.totalPaise - invoice.paidPaise);
                return (
                  <tr key={invoice.id}>
                    <td>
                      <Link href={`/app/billing/invoices/${invoice.id}`}>
                        {invoice.number}
                      </Link>
                      <div>{invoice.kind}</div>
                    </td>
                    <td>
                      {formatBillingDate(invoice.periodStart)} –{" "}
                      {formatBillingDate(invoice.periodEnd)}
                    </td>
                    <td>{formatBillingDate(invoice.dueAt)}</td>
                    <td>{formatInrPaise(invoice.totalPaise)}</td>
                    <td>{formatInrPaise(invoice.paidPaise)}</td>
                    <td>
                      <span className={`ws-billing-pill ${invoice.status.toLowerCase()}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td>
                      {invoice.status !== "PAID" && invoice.status !== "VOID" ? (
                        <InvoiceOpsForm
                          balanceRupees={paiseToRupees(balance)}
                          invoiceId={invoice.id}
                          organizationId={detail.id}
                        />
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>

      <article className="saas-panel">
        <h3>Active users</h3>
        <ul>
          {detail.memberships.map((member) => (
            <li key={member.id}>
              {member.user.name ?? member.user.email} · {member.user.email} · {member.role}
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}
