import Link from "next/link";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { requireSession } from "@/lib/require-session";
import { parseLeadsPeriodParams } from "@/lib/leads/period";
import { getMySpaceSnapshot } from "@/lib/my-space/expenses";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MySpacePage({ searchParams }: PageProps) {
  const user = await requireSession("MANAGER");
  const params = await searchParams;
  const period = parseLeadsPeriodParams({
    period: typeof params.period === "string" ? params.period : undefined,
    week: typeof params.week === "string" ? params.week : undefined,
    month: typeof params.month === "string" ? params.month : undefined,
    quarter: typeof params.quarter === "string" ? params.quarter : undefined,
    year: typeof params.year === "string" ? params.year : undefined,
  });
  const snapshot = await getMySpaceSnapshot(user.organizationId, period);

  return (
    <div className="saas-page ws-ims-sf">
      <div className="ws-ims-page">
        <TaskPageToolbar
          title="My Space"
          description="Track expenses, invoices, quotations, and lead volume — owner ops at a glance."
          actions={
            <Link href="/app/my-space/expenses" className="ws-btn ws-btn-primary">
              Add expense
            </Link>
          }
        />

        <section className="hs-quick-stats" aria-label="My Space summary">
          <article className="hs-quick-stat accent-warning">
            <span>Expenses · {snapshot.monthLabel}</span>
            <strong>{snapshot.expenseTotalLabel}</strong>
          </article>
          <article className="hs-quick-stat accent-blue">
            <span>Leads ({period.periodLabel})</span>
            <strong>{snapshot.leadsCount}</strong>
          </article>
          <article className="hs-quick-stat accent-success">
            <span>Quotations</span>
            <strong>
              {snapshot.quotationCount}
              <small className="leads-kpi-sub">{snapshot.quotationTotalLabel}</small>
            </strong>
          </article>
          <article className="hs-quick-stat accent-indigo">
            <span>Invoices</span>
            <strong>
              {snapshot.invoiceCount}
              <small className="leads-kpi-sub">{snapshot.invoiceTotalLabel}</small>
            </strong>
          </article>
          <article className="hs-quick-stat accent-purple">
            <span>Active numbers · plan</span>
            <strong>
              {snapshot.activePhoneNumbers}
              <small className="leads-kpi-sub">{snapshot.phonePlanCostLabel}</small>
            </strong>
          </article>
          <article className="hs-quick-stat">
            <span>Expense entries this month</span>
            <strong>{snapshot.expenseCount}</strong>
          </article>
        </section>

        <section className="ws-ims-panel">
          <div className="ws-ims-panel-head">
            <h2>This month by category</h2>
            <Link href="/app/my-space/expenses" className="ws-btn ws-btn-ghost ws-btn-small">
              Manage expenses
            </Link>
          </div>
          {snapshot.byCategory.length === 0 ? (
            <p className="ws-apple-record-empty">
              No expenses logged for {snapshot.monthLabel}. Add API costs, salary, rent, fuel,
              and subscriptions.
            </p>
          ) : (
            <div className="ws-ims-table-wrap">
              <table className="ws-ims-table ws-apple-data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Entries</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.byCategory.map((row) => (
                    <tr key={row.category}>
                      <td className="ws-apple-cell-primary">{row.label}</td>
                      <td className="ws-apple-cell-secondary">{row.count}</td>
                      <td className="ws-apple-cell-primary">{row.amountLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
