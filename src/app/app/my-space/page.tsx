import Link from "next/link";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { MySpacePeriodToolbar } from "@/components/my-space/my-space-period-toolbar";
import { requireSession } from "@/lib/require-session";
import { getMySpaceSnapshot } from "@/lib/my-space/expenses";
import { parseMySpacePeriodParams } from "@/lib/my-space/period";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function AnalysisTable({
  title,
  empty,
  columns,
  rows,
}: {
  title: string;
  empty: string;
  columns: [string, string, string?];
  rows: Array<{ label: string; count?: number; amountLabel?: string; value?: string }>;
}) {
  return (
    <section className="ws-ims-panel">
      <div className="ws-ims-panel-head">
        <h2>{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="ws-apple-record-empty">{empty}</p>
      ) : (
        <div className="ws-ims-table-wrap">
          <table className="ws-ims-table ws-apple-data-table">
            <thead>
              <tr>
                <th>{columns[0]}</th>
                {columns[1] ? <th>{columns[1]}</th> : null}
                {columns[2] ? <th>{columns[2]}</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <td className="ws-apple-cell-primary">{row.label}</td>
                  {columns[1] ? (
                    <td className="ws-apple-cell-secondary">
                      {row.value ?? row.count ?? "—"}
                    </td>
                  ) : null}
                  {columns[2] ? (
                    <td className="ws-apple-cell-primary">{row.amountLabel ?? "—"}</td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default async function MySpacePage({ searchParams }: PageProps) {
  const user = await requireSession("MANAGER");
  const params = await searchParams;
  const period = parseMySpacePeriodParams({
    period: typeof params.period === "string" ? params.period : undefined,
    week: typeof params.week === "string" ? params.week : undefined,
    month: typeof params.month === "string" ? params.month : undefined,
    quarter: typeof params.quarter === "string" ? params.quarter : undefined,
    year: typeof params.year === "string" ? params.year : undefined,
  });
  const snapshot = await getMySpaceSnapshot(user.organizationId, period);
  const leadsLabel = period.type === "all" ? "Total Leads" : "Total Leads This Month";

  return (
    <div className="saas-page ws-ims-sf">
      <div className="ws-ims-page">
        <TaskPageToolbar
          title="My Space"
          description="Expense Incurred, Payment Received (by received date), Leads, Invoices & Quotations (by generated date)."
          actions={
            <Link href="/app/my-space/expenses" className="ws-btn ws-btn-primary">
              Add Expense
            </Link>
          }
        />

        <MySpacePeriodToolbar period={period} />

        <section className="hs-quick-stats" aria-label="My Space summary">
          <article className="hs-quick-stat accent-warning">
            <span>Expense Incurred</span>
            <strong>{snapshot.expenseIncurredLabel}</strong>
          </article>
          <article className="hs-quick-stat">
            <span>Fixed Expenses</span>
            <strong>
              {snapshot.fixedExpenseTotalLabel}
              <small className="leads-kpi-sub">{snapshot.fixedExpenseCount} items</small>
            </strong>
          </article>
          <article className="hs-quick-stat accent-success">
            <span>Payment received</span>
            <strong>
              {snapshot.paymentReceivedLabel}
              <small className="leads-kpi-sub">{snapshot.paymentCount} by received date</small>
            </strong>
          </article>
          <article className="hs-quick-stat accent-blue">
            <span>{leadsLabel}</span>
            <strong>{snapshot.totalLeads}</strong>
          </article>
          <article className="hs-quick-stat accent-indigo">
            <span>Invoices generated</span>
            <strong>
              {snapshot.invoicedValueLabel}
              <small className="leads-kpi-sub">{snapshot.invoiceCount} by generated date</small>
            </strong>
          </article>
          <article className="hs-quick-stat accent-purple">
            <span>Quotations generated</span>
            <strong>
              {snapshot.proposalValueLabel}
              <small className="leads-kpi-sub">{snapshot.proposalCount} by generated date</small>
            </strong>
          </article>
        </section>

        <div className="ws-myspace-analysis-grid">
          <AnalysisTable
            title="Expense Incurred (Category wise Analysis)"
            empty="No expenses in this period."
            columns={["Category", "Entries", "Amount"]}
            rows={snapshot.expenseIncurredByCategory}
          />
          <AnalysisTable
            title="Received Payment (Category wise)"
            empty="No payments received in this period."
            columns={["Category", "Entries", "Amount"]}
            rows={snapshot.paymentReceivedByCategory}
          />
          <AnalysisTable
            title="No. of Leads (Source wise)"
            empty="No leads in this period."
            columns={["Source", "Leads"]}
            rows={snapshot.leadsBySource.map((row) => ({
              label: row.label,
              value: String(row.count),
            }))}
          />
        </div>

        <section className="ws-ims-panel">
          <div className="ws-ims-panel-head">
            <h2>Period detail · {snapshot.periodTitle}</h2>
            <Link href="/app/my-space/expenses" className="ws-btn ws-btn-ghost ws-btn-small">
              Manage Expenses
            </Link>
          </div>
          <div className="ws-ims-table-wrap">
            <table className="ws-ims-table ws-apple-data-table">
              <tbody>
                <tr>
                  <td className="ws-apple-cell-secondary">Fixed Expenses</td>
                  <td className="ws-apple-cell-primary">{snapshot.fixedExpenseTotalLabel}</td>
                  <td className="ws-apple-cell-secondary">
                    <Link href="/app/my-space/expenses?type=fixed">
                      {snapshot.fixedExpenseCount} fixed
                    </Link>
                  </td>
                </tr>
                <tr>
                  <td className="ws-apple-cell-secondary">Invoices generated</td>
                  <td className="ws-apple-cell-primary">{snapshot.invoicedValueLabel}</td>
                  <td className="ws-apple-cell-secondary">{snapshot.invoiceCount} by generated date</td>
                </tr>
                <tr>
                  <td className="ws-apple-cell-secondary">Quotations generated</td>
                  <td className="ws-apple-cell-primary">{snapshot.proposalValueLabel}</td>
                  <td className="ws-apple-cell-secondary">{snapshot.proposalCount} by generated date</td>
                </tr>
                <tr>
                  <td className="ws-apple-cell-secondary">Payment received</td>
                  <td className="ws-apple-cell-primary">{snapshot.paymentReceivedLabel}</td>
                  <td className="ws-apple-cell-secondary">{snapshot.paymentCount} by received date</td>
                </tr>
                <tr>
                  <td className="ws-apple-cell-secondary">Active Numbers · Plan</td>
                  <td className="ws-apple-cell-primary">{snapshot.activePhoneNumbers}</td>
                  <td className="ws-apple-cell-secondary">{snapshot.phonePlanCostLabel}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
