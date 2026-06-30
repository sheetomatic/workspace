"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { LeadDrawerPanel, type LeadDrawerData } from "@/components/saas/leads-drawer-panel";
import { formatInr, leadCategoryLabel } from "@/lib/leads/categories";
import { buildLeadsListQuery, type LeadsListSearchParams } from "@/lib/leads/list-params";
import { leadStatusLabel } from "@/lib/leads/status-labels";

type TeamMember = {
  user: { id: string; name: string | null; email: string };
};

type LeadRow = LeadDrawerData & {
  capturedAt: string | null;
  createdAt: string;
  pipeValue: string | number | null;
  followUps: Array<{
    id: string;
    scheduledAt: string;
    notes: string | null;
  }>;
};

function formatCompactTimestamp(value: string | null, fallback: string) {
  const date = new Date(value ?? fallback);
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function quotationAmount(lead: LeadRow) {
  const raw = lead.quotationValue;
  if (raw == null || raw === "") {
    return null;
  }
  const amount = Number(raw);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function LeadsCrmWorkspace({
  leads,
  total,
  page,
  totalPages,
  listParams,
  periodLabel,
  period,
  workspaceTotal,
  teamMembers,
  canManage,
  sort,
  serviceCatalog,
}: {
  leads: LeadRow[];
  total: number;
  page: number;
  totalPages: number;
  listParams: LeadsListSearchParams;
  periodLabel: string;
  period: string;
  workspaceTotal: number;
  teamMembers: TeamMember[];
  canManage: boolean;
  sort: "newest" | "oldest";
  serviceCatalog: Array<{
    id: string;
    serviceCategory: string;
    subCategory: string;
    unitPrice: string | number | null;
  }>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState(listParams.q ?? "");
  const [pending, startTransition] = useTransition();

  const selected = useMemo(
    () => leads.find((lead) => lead.id === selectedId) ?? null,
    [leads, selectedId],
  );

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [selectedId]);

  const sortHref =
    sort === "newest"
      ? `/app/leads?${buildLeadsListQuery(listParams, { sort: "oldest", page: "1" })}`
      : `/app/leads?${buildLeadsListQuery(listParams, { sort: "newest", page: "1" })}`;

  return (
    <div className="leads-crm">
      <div className="leads-crm-toolbar">
        <form className="leads-crm-search" action="/app/leads" method="get">
          {Object.entries(listParams).map(([key, value]) =>
            key !== "q" && key !== "page" && value ? (
              <input key={key} type="hidden" name={key} value={value} />
            ) : null,
          )}
          <input
            type="search"
            name="q"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Search leads…"
          />
          <button type="submit" className="btn-secondary btn-sm">
            Search
          </button>
        </form>
        <div className="leads-crm-toolbar-actions">
          <Link className="btn-secondary btn-sm" href={sortHref}>
            {sort === "newest" ? "Newest" : "Oldest"}
          </Link>
          <span className="leads-crm-count">
            {total} leads · p{page}/{totalPages}
          </span>
        </div>
      </div>

      <div className="leads-crm-table-wrap">
        <div className="leads-table-head">
          <h2>{periodLabel}</h2>
        </div>
        <table className="leads-crm-table leads-crm-table-compact">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Time</th>
              <th>Category</th>
              <th>Status</th>
              <th>Quoted</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="leads-empty-state">
                    <p className="leads-machine-muted">No leads match this filter.</p>
                    {workspaceTotal > 0 && period !== "all" ? (
                      <p className="leads-machine-muted">
                        {workspaceTotal} in workspace.{" "}
                        <Link href="/app/leads?period=all">View all</Link>
                      </p>
                    ) : null}
                    {workspaceTotal === 0 ? (
                      <p className="leads-machine-muted">
                        <Link href="/app/leads/settings">Setup</Link> Google Sheets to import.
                      </p>
                    ) : null}
                  </div>
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const quoted = quotationAmount(lead);
                return (
                  <tr
                    key={lead.id}
                    className={
                      selectedId === lead.id
                        ? "leads-crm-row is-selected"
                        : "leads-crm-row"
                    }
                    onClick={() => setSelectedId(lead.id)}
                  >
                    <td>
                      <strong className="leads-row-name">{lead.name || "Unnamed"}</strong>
                      <span className="leads-machine-sub leads-row-contact">
                        {lead.phone || lead.email || "—"}
                      </span>
                    </td>
                    <td className="leads-row-time">
                      {formatCompactTimestamp(lead.capturedAt, lead.createdAt)}
                    </td>
                    <td>
                      <span className="leads-category-badge">
                        {leadCategoryLabel(lead.category)}
                      </span>
                    </td>
                    <td>
                      <span className="leads-status-badge">{leadStatusLabel(lead.status)}</span>
                    </td>
                    <td className="leads-row-quoted">
                      {quoted ? formatInr(quoted) : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="leads-crm-pagination">
        {page > 1 ? (
          <Link
            className="btn-secondary btn-sm"
            href={`/app/leads?${buildLeadsListQuery(listParams, { page: String(page - 1) })}`}
          >
            Previous
          </Link>
        ) : (
          <span />
        )}
        {page < totalPages ? (
          <Link
            className="btn-secondary btn-sm"
            href={`/app/leads?${buildLeadsListQuery(listParams, { page: String(page + 1) })}`}
          >
            Next
          </Link>
        ) : null}
      </div>

      {selected ? (
        <div
          className="leads-drawer-backdrop"
          role="presentation"
          onClick={() => setSelectedId(null)}
        >
          <LeadDrawerPanel
            canManage={canManage}
            lead={selected}
            onClose={() => setSelectedId(null)}
            onDeleted={() => setSelectedId(null)}
            pending={pending}
            serviceCatalog={serviceCatalog}
            startTransition={startTransition}
            teamMembers={teamMembers}
          />
        </div>
      ) : null}
    </div>
  );
}
