import Link from "next/link";
import { LeadsPipelineFilters } from "@/components/saas/leads-pipeline-filters";
import { buildLeadsListQuery, type LeadsListSearchParams } from "@/lib/leads/list-params";

export function LeadsPipelineCards({
  baseParams,
  activeStatus,
  activeCategory,
  pipeMetrics,
  byStatus,
}: {
  baseParams: LeadsListSearchParams;
  activeStatus?: string;
  activeCategory?: string;
  pipeMetrics: {
    pipeCount: number;
    pipeValueLabel: string;
    wonCount: number;
    wonValueLabel: string;
    invoiceCount: number;
    invoiceValueLabel: string;
    conversionRate: number;
    conversionValueRate: number;
    totalValueLabel: string;
    byCategory: Array<{
      category: string;
      label: string;
      count: number;
      valueLabel: string;
    }>;
  };
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
        <Link
          className="hs-quick-stat accent-purple leads-pipeline-card"
          href={`/app/leads?${buildLeadsListQuery(baseParams, { status: "INVOICE", page: "1" })}`}
        >
          <span>Invoice count</span>
          <strong>{pipeMetrics.invoiceCount}</strong>
        </Link>
        <Link
          className="hs-quick-stat accent-indigo leads-pipeline-card"
          href={`/app/leads?${buildLeadsListQuery(baseParams, { status: "INVOICE", page: "1" })}`}
        >
          <span>Invoice value</span>
          <strong>{pipeMetrics.invoiceValueLabel}</strong>
        </Link>
        <Link
          className="hs-quick-stat accent-success leads-pipeline-card"
          href={`/app/leads?${buildLeadsListQuery(baseParams, { status: "WON", page: "1" })}`}
        >
          <span>Won · {pipeMetrics.conversionRate}%</span>
          <strong>{pipeMetrics.wonValueLabel}</strong>
        </Link>
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
