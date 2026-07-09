"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { MessageCircle, Phone, Trash2 } from "lucide-react";
import {
  deleteInboundLead,
  logLeadContactAction,
} from "@/app/app/leads/actions";
import { LeadDrawerPanel, type LeadDrawerData } from "@/components/saas/leads-drawer-panel";
import { LeadDeliveryStagePill } from "@/components/saas/lead-delivery-journey";
import { LeadCategorySelect } from "@/components/saas/lead-category-select";
import { LeadStatusSelect } from "@/components/saas/lead-status-select";
import { formatInr } from "@/lib/leads/categories";
import { leadTelHref, leadWhatsAppHref } from "@/lib/leads/contact-links";
import { buildLeadsListQuery, type LeadsListSearchParams } from "@/lib/leads/list-params";

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

function formatLeadPhone(phone: string | null | undefined) {
  if (!phone?.trim()) {
    return null;
  }
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return phone.trim();
}

function leadPrimaryLabel(lead: LeadRow) {
  const name = lead.name?.trim();
  if (name) {
    return name;
  }
  return formatLeadPhone(lead.phone) ?? lead.email?.trim() ?? "Unnamed lead";
}

function leadSecondaryLabel(lead: LeadRow) {
  const name = lead.name?.trim();
  if (name) {
    if (lead.phone) {
      return formatLeadPhone(lead.phone);
    }
    if (lead.email?.trim()) {
      return lead.email.trim();
    }
    return null;
  }
  if (lead.phone && lead.email?.trim()) {
    return lead.email.trim();
  }
  return null;
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
  organizationName,
  organizationLogoUrl,
  initialSelectedLeadId = null,
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
  }>;
  organizationName: string;
  organizationLogoUrl: string | null;
  initialSelectedLeadId?: string | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedLeadId);
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
    const scrollRoot = document.getElementById("main");
    if (!scrollRoot) {
      return;
    }
    const previous = scrollRoot.style.overflow;
    scrollRoot.style.overflow = "hidden";
    return () => {
      scrollRoot.style.overflow = previous;
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
          <span className="leads-crm-period">{periodLabel}</span>
          <Link className="btn-secondary btn-sm" href={sortHref}>
            {sort === "newest" ? "Newest" : "Oldest"}
          </Link>
          <span className="leads-crm-count">
            {total} leads · p{page}/{totalPages}
          </span>
        </div>
      </div>

      <div className="leads-crm-table-wrap">
        <table className="leads-crm-table leads-crm-table-pro">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Time</th>
              <th>Category</th>
              <th>Status</th>
              <th>Lead Stage</th>
              <th className="leads-col-quoted">Quoted</th>
              <th className="leads-col-actions" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={7}>
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
                const telHref = leadTelHref(lead.phone);
                const waHref = leadWhatsAppHref(lead.phone, lead.name);
                const primary = leadPrimaryLabel(lead);
                const secondary = leadSecondaryLabel(lead);
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
                    <td className="leads-row-lead">
                      <div className="leads-row-lead-copy">
                        <strong className="leads-row-name">{primary}</strong>
                        {secondary ? (
                          <span className="leads-row-contact">{secondary}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="leads-row-time">
                      {formatCompactTimestamp(lead.capturedAt, lead.createdAt)}
                    </td>
                    <td className="leads-row-category">
                      <LeadCategorySelect
                        disabled={!canManage}
                        leadId={lead.id}
                        value={lead.category}
                      />
                    </td>
                    <td className="leads-row-status">
                      <LeadStatusSelect
                        disabled={!canManage}
                        leadId={lead.id}
                        value={lead.status}
                      />
                    </td>
                    <td className="leads-row-delivery">
                      <LeadDeliveryStagePill
                        lead={{
                          quotations: lead.quotations,
                          payments: lead.payments,
                          salesOrder: lead.salesOrder ?? null,
                        }}
                      />
                    </td>
                    <td className="leads-row-quoted">
                      {quoted ? (
                        <span className="leads-row-quoted-value">{formatInr(quoted)}</span>
                      ) : (
                        <span className="leads-row-quoted-empty">—</span>
                      )}
                    </td>
                    <td className="leads-row-actions-cell">
                      <div
                        className="leads-row-actions"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        {telHref ? (
                          <a
                            className="leads-icon-btn"
                            href={telHref}
                            title="Call"
                            aria-label={`Call ${lead.name || "lead"}`}
                            onClick={() =>
                              startTransition(async () => {
                                await logLeadContactAction(lead.id, "CALL");
                              })
                            }
                          >
                            <Phone size={16} />
                          </a>
                        ) : null}
                        {waHref ? (
                          <a
                            className="leads-icon-btn"
                            href={waHref}
                            target="_blank"
                            rel="noreferrer"
                            title="WhatsApp"
                            aria-label={`WhatsApp ${lead.name || "lead"}`}
                            onClick={() =>
                              startTransition(async () => {
                                await logLeadContactAction(lead.id, "WHATSAPP");
                              })
                            }
                          >
                            <MessageCircle size={16} />
                          </a>
                        ) : null}
                        {canManage ? (
                          <button
                            type="button"
                            className="leads-icon-btn danger"
                            title="Delete lead"
                            aria-label={`Delete ${lead.name || "lead"}`}
                            disabled={pending}
                            onClick={() => {
                              if (window.confirm("Delete this lead?")) {
                                startTransition(async () => {
                                  await deleteInboundLead(lead.id);
                                  if (selectedId === lead.id) {
                                    setSelectedId(null);
                                  }
                                });
                              }
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : null}
                      </div>
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
            organizationLogoUrl={organizationLogoUrl}
            organizationName={organizationName}
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
