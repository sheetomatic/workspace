export type CrmNumbersMetrics = {
  quotationsGeneratedCount: number;
  quotationsGeneratedValueLabel: string;
  invoicesGeneratedCount: number;
  invoicesGeneratedValueLabel: string;
  paymentsReceivedCount: number;
  paymentsReceivedValueLabel: string;
  newClientsOnboardedCount: number;
};

/** Numbers dashboard keyed by generated/received dates + first-time clients. */
export function LeadsNumbersDashboard({
  metrics,
  periodLabel,
}: {
  metrics: CrmNumbersMetrics;
  periodLabel: string;
}) {
  return (
    <section className="leads-numbers-dashboard" aria-label="CRM numbers dashboard">
      <header className="leads-numbers-dashboard-head">
        <h2>Numbers dashboard</h2>
        <p>
          Period · {periodLabel}. Quotations/invoices by generated date; payments by
          received date. New clients count only the first invoice or payment — repeat
          billing to regulars is excluded.
        </p>
      </header>
      <div className="hs-quick-stats">
        <article className="hs-quick-stat accent-purple leads-pipeline-card is-static">
          <span>Quotations generated</span>
          <strong>
            {metrics.quotationsGeneratedCount}
            <small className="leads-kpi-sub">
              {metrics.quotationsGeneratedValueLabel}
            </small>
          </strong>
        </article>
        <article className="hs-quick-stat accent-indigo leads-pipeline-card is-static">
          <span>Invoices generated</span>
          <strong>
            {metrics.invoicesGeneratedCount}
            <small className="leads-kpi-sub">
              {metrics.invoicesGeneratedValueLabel}
            </small>
          </strong>
        </article>
        <article className="hs-quick-stat accent-success leads-pipeline-card is-static">
          <span>Payment received</span>
          <strong>
            {metrics.paymentsReceivedCount}
            <small className="leads-kpi-sub">
              {metrics.paymentsReceivedValueLabel}
            </small>
          </strong>
        </article>
        <article className="hs-quick-stat accent-blue leads-pipeline-card is-static">
          <span>New clients onboarded</span>
          <strong>
            {metrics.newClientsOnboardedCount}
            <small className="leads-kpi-sub">First-time only</small>
          </strong>
        </article>
      </div>
    </section>
  );
}
