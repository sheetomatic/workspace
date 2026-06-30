import Link from "next/link";
import type { InboundLeadStatus } from "@prisma/client";
import { leadCategoryLabel } from "@/lib/leads/categories";
import { buildLeadsListQuery, type LeadsListSearchParams } from "@/lib/leads/list-params";

import { LEAD_STATUS_ORDER, leadStatusLabel } from "@/lib/leads/status-labels";

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
  const statusCards = LEAD_STATUS_ORDER.map((status) => ({
    status,
    label: leadStatusLabel(status),
    count: byStatus[status] ?? 0,
    href: `/app/leads?${buildLeadsListQuery(baseParams, {
      status: activeStatus === status ? "" : status,
      page: "1",
    })}`,
    active: activeStatus === status,
  }));

  return (
    <section className="leads-pipeline" aria-label="Pipeline metrics">
      <div className="hs-quick-stats">
        <Link
          className="hs-quick-stat accent-blue leads-pipeline-card"
          href={`/app/leads?${buildLeadsListQuery(baseParams, { status: "", category: "", page: "1" })}`}
        >
          <span>Pipe count</span>
          <strong>{pipeMetrics.pipeCount}</strong>
        </Link>
        <article className="hs-quick-stat accent-warning leads-pipeline-card is-static">
          <span>Pipe value</span>
          <strong>{pipeMetrics.pipeValueLabel}</strong>
        </article>
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

      <div className="leads-pipeline-row">
        <div className="leads-pipeline-group">
          <h3>Status</h3>
          <div className="leads-pipeline-chips">
            {statusCards.map((card) => (
              <Link
                key={card.status}
                className={
                  card.active
                    ? "leads-pipeline-chip active"
                    : "leads-pipeline-chip"
                }
                href={card.href}
              >
                <span>{card.label}</span>
                <strong>{card.count}</strong>
              </Link>
            ))}
          </div>
        </div>

        <div className="leads-pipeline-group">
          <h3>AI categories</h3>
          <div className="leads-pipeline-chips">
            {pipeMetrics.byCategory.map((row) => (
              <Link
                key={row.category}
                className={
                  activeCategory === row.category
                    ? "leads-pipeline-chip active"
                    : "leads-pipeline-chip"
                }
                href={`/app/leads?${buildLeadsListQuery(baseParams, {
                  category: activeCategory === row.category ? "" : row.category,
                  page: "1",
                })}`}
              >
                <span>{row.label}</span>
                <strong>
                  {row.count} · {row.valueLabel}
                </strong>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
