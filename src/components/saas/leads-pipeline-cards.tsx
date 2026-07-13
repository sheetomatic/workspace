import Link from "next/link";
import { LeadsPipelineFilters } from "@/components/saas/leads-pipeline-filters";
import type { CrmNumbersMetrics } from "@/components/saas/leads-numbers-dashboard";
import { buildLeadsListQuery, type LeadsListSearchParams } from "@/lib/leads/list-params";

export function LeadsPipelineCards({
  baseParams,
  activeStatus,
  activeCategory,
  pipeMetrics,
  numbersMetrics,
  byStatus,
}: {
  baseParams: LeadsListSearchParams;
  activeStatus?: string;
  activeCategory?: string;
  pipeMetrics: {
    pipeCount: number;
    pipeValueLabel: string;
    forecastValueLabel: string;
    totalValueLabel: string;
    byCategory: Array<{
      category: string;
      label: string;
      count: number;
      valueLabel: string;
    }>;
  };
  numbersMetrics: CrmNumbersMetrics;
  byStatus: Record<string, number>;
}) {
  return (
    <section className="leads-pipeline" aria-label="Pipeline metrics">
      <div className="hs-quick-stats">
        <Link
          className="hs-quick-stat accent-blue leads-pipeline-card"
          href={`/app/leads?${buildLeadsListQuery(baseParams, { status: "", category: "", page: "1" })}`}
        >
          <span>Leads</span>
          <strong>{pipeMetrics.pipeCount}</strong>
        </Link>
        <article className="hs-quick-stat accent-warning leads-pipeline-card is-static">
          <span>Quoted value</span>
          <strong>{pipeMetrics.pipeValueLabel}</strong>
        </article>
        <article className="hs-quick-stat accent-teal leads-pipeline-card is-static">
          <span>Forecast</span>
          <strong>{pipeMetrics.forecastValueLabel}</strong>
        </article>
        <article className="hs-quick-stat accent-success leads-pipeline-card is-static">
          <span>Payment received</span>
          <strong>
            {numbersMetrics.paymentsReceivedValueLabel}
            <small className="leads-kpi-sub">
              {numbersMetrics.paymentsReceivedCount} by received date
            </small>
          </strong>
        </article>
        <article className="hs-quick-stat accent-indigo leads-pipeline-card is-static">
          <span>Invoice value</span>
          <strong>
            {numbersMetrics.invoicesGeneratedValueLabel}
            <small className="leads-kpi-sub">
              {numbersMetrics.invoicesGeneratedCount} generated
            </small>
          </strong>
        </article>
        <article className="hs-quick-stat accent-purple leads-pipeline-card is-static">
          <span>New clients onboarded</span>
          <strong>
            {numbersMetrics.newClientsOnboardedCount}
            <small className="leads-kpi-sub">First invoice or payment</small>
          </strong>
        </article>
        <article className="hs-quick-stat leads-pipeline-card is-static">
          <span>Total pipeline</span>
          <strong>{pipeMetrics.totalValueLabel}</strong>
        </article>
      </div>

      <LeadsPipelineFilters
        activeCategory={activeCategory}
        activeStatus={activeStatus}
        baseParams={baseParams}
        byCategory={pipeMetrics.byCategory}
        byStatus={byStatus}
      />
    </section>
  );
}
