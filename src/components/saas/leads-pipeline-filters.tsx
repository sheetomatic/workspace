"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { InboundLeadStatus } from "@prisma/client";
import { buildLeadsListQuery, type LeadsListSearchParams } from "@/lib/leads/list-params";
import { LEAD_STATUS_ORDER, leadStatusLabel } from "@/lib/leads/status-labels";

export function LeadsPipelineFilters({
  baseParams,
  activeStatus,
  activeCategory,
  byStatus,
  byCategory,
}: {
  baseParams: LeadsListSearchParams;
  activeStatus?: string;
  activeCategory?: string;
  byStatus: Record<string, number>;
  byCategory: Array<{
    category: string;
    label: string;
    count: number;
    valueLabel: string;
  }>;
}) {
  const router = useRouter();
  const hasFilters = Boolean(activeStatus || activeCategory);

  function navigate(patch: Partial<LeadsListSearchParams>) {
    const href = `/app/leads?${buildLeadsListQuery(baseParams, { ...patch, page: "1" })}`;
    router.push(href);
  }

  return (
    <div className="leads-pipeline-filters">
      <label className="leads-pipeline-filter">
        <span>Status</span>
        <select
          value={activeStatus ?? ""}
          onChange={(event) =>
            navigate({ status: event.target.value as InboundLeadStatus | "" })
          }
        >
          <option value="">All statuses</option>
          {LEAD_STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {leadStatusLabel(status)} ({byStatus[status] ?? 0})
            </option>
          ))}
        </select>
      </label>

      <label className="leads-pipeline-filter">
        <span>Category</span>
        <select
          value={activeCategory ?? ""}
          onChange={(event) => navigate({ category: event.target.value })}
        >
          <option value="">All categories</option>
          {byCategory.map((row) => (
            <option key={row.category} value={row.category}>
              {row.label} ({row.count}
              {row.valueLabel !== "₹0" ? ` · ${row.valueLabel}` : ""})
            </option>
          ))}
        </select>
      </label>

      {hasFilters ? (
        <Link
          className="btn-secondary btn-sm leads-pipeline-clear"
          href={`/app/leads?${buildLeadsListQuery(baseParams, {
            status: "",
            category: "",
            page: "1",
          })}`}
        >
          Clear filters
        </Link>
      ) : null}
    </div>
  );
}
