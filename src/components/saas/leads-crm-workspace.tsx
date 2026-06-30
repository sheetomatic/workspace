"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { InboundLeadStatus } from "@prisma/client";
import {
  assignInboundLead,
  deleteInboundLead,
  logLeadContactAction,
  updateInboundLeadStatus,
} from "@/app/app/leads/actions";
import { LeadDrawerPanel } from "@/components/saas/leads-drawer-panel";
import { leadCategoryLabel } from "@/lib/leads/categories";
import { buildLeadsListQuery, type LeadsListSearchParams } from "@/lib/leads/list-params";
import { LEAD_STATUS_LABELS, leadStatusLabel } from "@/lib/leads/status-labels";

type TeamMember = {
  user: { id: string; name: string | null; email: string };
};

type ActivityRow = {
  id: string;
  type: string;
  body: string | null;
  createdAt: string;
  createdBy: { name: string | null; email: string } | null;
};

type LeadRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  address: string | null;
  zipCode: string | null;
  requirement: string | null;
  category: string | null;
  status: InboundLeadStatus;
  aiSuggestedStatus: InboundLeadStatus | null;
  callingStatus: string;
  projectStatus: string;
  discussionNotes: string | null;
  meetingNotes: string | null;
  quotationValue: string | number | null;
  pipeValue: string | number | null;
  nextFollowUpAt: string | null;
  capturedAt: string | null;
  createdAt: string;
  assignedTo: { id: string; name: string | null; email: string } | null;
  followUps: Array<{
    id: string;
    scheduledAt: string;
    notes: string | null;
  }>;
  payments: Array<{
    id: string;
    paymentType: string;
    receivedAmount: string | number;
    receivedDate: string;
    paymentMethod: string;
    notes: string | null;
  }>;
  quotations: Array<{
    id: string;
    quotationNumber: string;
    requestType: string;
    totalAmount: string | number;
    quotationDate: string;
    sentAt: string | null;
  }>;
  offeredServices: Array<{
    id: string;
    serviceCategory: string;
    subCategory: string;
    unitPrice: string | number | null;
  }>;
  activities: ActivityRow[];
};

function formatTimestamp(value: string | null, fallback: string) {
  const date = new Date(value ?? fallback);
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function phoneDigits(phone: string | null) {
  return phone?.replace(/\D/g, "") ?? "";
}

function waHref(phone: string | null, name: string | null) {
  const digits = phoneDigits(phone);
  if (!digits) {
    return null;
  }
  const message = `Hi ${name || "there"}, thank you for reaching out to Sheetomatic.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
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

  const sortHref =
    sort === "newest"
      ? `/app/leads?${buildLeadsListQuery(listParams, { sort: "oldest", page: "1" })}`
      : `/app/leads?${buildLeadsListQuery(listParams, { sort: "newest", page: "1" })}`;

  return (
    <div className="leads-crm">
      <div className="leads-crm-toolbar">
        <form
          className="leads-crm-search"
          action="/app/leads"
          method="get"
        >
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
            placeholder="Search name, phone, email, requirement"
          />
          <button type="submit" className="btn-secondary btn-sm">
            Search
          </button>
        </form>
        <div className="leads-crm-toolbar-actions">
          <Link className="btn-secondary btn-sm" href={sortHref}>
            Sort: {sort === "newest" ? "Newest first" : "Oldest first"}
          </Link>
          <span className="leads-crm-count">
            {total} lead{total === 1 ? "" : "s"} · page {page} of {totalPages}
          </span>
        </div>
      </div>

      <div className="leads-crm-table-wrap">
        <div className="leads-table-head">
          <h2>Leads ({periodLabel})</h2>
        </div>
        <table className="leads-crm-table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Timestamp</th>
              <th>Category</th>
              <th>Status</th>
              <th>Owner</th>
              <th>Next follow-up</th>
              {canManage ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 7 : 6}>
                  <div className="leads-empty-state">
                    <p className="leads-machine-muted">No leads match this filter.</p>
                    {workspaceTotal > 0 && period !== "all" ? (
                      <p className="leads-machine-muted">
                        {workspaceTotal} lead{workspaceTotal === 1 ? "" : "s"} in this workspace.{" "}
                        <Link href="/app/leads?period=all">View all leads</Link>
                      </p>
                    ) : null}
                    {workspaceTotal === 0 ? (
                      <p className="leads-machine-muted">
                        Connect Google Sheets in{" "}
                        <Link href="/app/leads/settings">setup</Link> and run sync to import leads.
                      </p>
                    ) : null}
                  </div>
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const callDigits = phoneDigits(lead.phone);
                const whatsapp = waHref(lead.phone, lead.name);
                return (
                  <tr key={lead.id} className={selectedId === lead.id ? "is-selected" : ""}>
                    <td>
                      <button
                        type="button"
                        className="leads-row-open"
                        onClick={() => setSelectedId(lead.id)}
                      >
                        <strong>{lead.name || "Unnamed lead"}</strong>
                      </button>
                      <span className="leads-machine-sub">
                        {lead.phone || lead.email || "No contact"}
                      </span>
                      {lead.requirement ? (
                        <span className="leads-machine-sub">{lead.requirement}</span>
                      ) : null}
                    </td>
                    <td>{formatTimestamp(lead.capturedAt, lead.createdAt)}</td>
                    <td>
                      <span className="leads-category-badge">
                        {leadCategoryLabel(lead.category)}
                      </span>
                    </td>
                    <td>
                      {canManage ? (
                        <select
                          value={lead.status}
                          disabled={pending}
                          onChange={(event) =>
                            startTransition(async () => {
                              await updateInboundLeadStatus(
                                lead.id,
                                event.target.value as InboundLeadStatus,
                              );
                            })
                          }
                        >
                          {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        leadStatusLabel(lead.status)
                      )}
                    </td>
                    <td>
                      {canManage ? (
                        <select
                          value={lead.assignedTo?.id ?? ""}
                          disabled={pending}
                          onChange={(event) =>
                            startTransition(async () => {
                              await assignInboundLead(lead.id, event.target.value || null);
                            })
                          }
                        >
                          <option value="">Unassigned</option>
                          {teamMembers.map((member) => (
                            <option key={member.user.id} value={member.user.id}>
                              {member.user.name || member.user.email}
                            </option>
                          ))}
                        </select>
                      ) : (
                        lead.assignedTo?.name || lead.assignedTo?.email || "Unassigned"
                      )}
                    </td>
                    <td>
                      {lead.nextFollowUpAt
                        ? formatTimestamp(lead.nextFollowUpAt, lead.createdAt)
                        : "—"}
                    </td>
                    {canManage ? (
                      <td>
                        <div className="leads-row-actions">
                          {callDigits ? (
                            <a
                              className="leads-action-btn"
                              href={`tel:${callDigits}`}
                              onClick={() =>
                                startTransition(async () => {
                                  await logLeadContactAction(lead.id, "CALL");
                                })
                              }
                            >
                              Call
                            </a>
                          ) : null}
                          {whatsapp ? (
                            <a
                              className="leads-action-btn"
                              href={whatsapp}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() =>
                                startTransition(async () => {
                                  await logLeadContactAction(lead.id, "WHATSAPP");
                                })
                              }
                            >
                              WA
                            </a>
                          ) : null}
                          <button
                            type="button"
                            className="leads-action-btn"
                            onClick={() => setSelectedId(lead.id)}
                          >
                            Open
                          </button>
                          <button
                            type="button"
                            className="leads-action-btn danger"
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
                            Delete
                          </button>
                        </div>
                      </td>
                    ) : null}
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
            Previous 20
          </Link>
        ) : (
          <span />
        )}
        {page < totalPages ? (
          <Link
            className="btn-secondary btn-sm"
            href={`/app/leads?${buildLeadsListQuery(listParams, { page: String(page + 1) })}`}
          >
            Next 20
          </Link>
        ) : null}
      </div>

      {selected ? (
        <div className="leads-drawer-backdrop" role="presentation" onClick={() => setSelectedId(null)}>
          <LeadDrawerPanel
            canManage={canManage}
            lead={selected}
            onClose={() => setSelectedId(null)}
            pending={pending}
            serviceCatalog={serviceCatalog}
            startTransition={startTransition}
          />
        </div>
      ) : null}
    </div>
  );
}
