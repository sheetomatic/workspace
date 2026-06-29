"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { InboundLeadStatus } from "@prisma/client";
import {
  addInboundLeadNote,
  assignInboundLead,
  deleteInboundLead,
  logLeadContactAction,
  scheduleInboundLeadFollowUp,
  updateInboundLeadDetails,
  updateInboundLeadStatus,
} from "@/app/app/leads/actions";
import { leadCategoryLabel } from "@/lib/leads/categories";
import { buildLeadsListQuery, type LeadsListSearchParams } from "@/lib/leads/list-params";

const STATUS_LABELS: Record<InboundLeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  FOLLOW_UP: "Follow-up",
  QUALIFIED: "Qualified",
  WON: "Won",
  LOST: "Lost",
};

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
  requirement: string | null;
  category: string | null;
  status: InboundLeadStatus;
  discussionNotes: string | null;
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

function defaultFollowUpLocal() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function LeadsCrmWorkspace({
  leads,
  total,
  page,
  totalPages,
  listParams,
  periodLabel,
  teamMembers,
  canManage,
  sort,
}: {
  leads: LeadRow[];
  total: number;
  page: number;
  totalPages: number;
  listParams: LeadsListSearchParams;
  periodLabel: string;
  teamMembers: TeamMember[];
  canManage: boolean;
  sort: "newest" | "oldest";
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
                  <p className="leads-machine-muted">No leads match this filter.</p>
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
                          {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        STATUS_LABELS[lead.status]
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
        <LeadDetailDrawer
          canManage={canManage}
          lead={selected}
          onClose={() => setSelectedId(null)}
          pending={pending}
          startTransition={startTransition}
        />
      ) : null}
    </div>
  );
}

function LeadDetailDrawer({
  lead,
  canManage,
  onClose,
  pending,
  startTransition,
}: {
  lead: LeadRow;
  canManage: boolean;
  onClose: () => void;
  pending: boolean;
  startTransition: (callback: () => Promise<void>) => void;
}) {
  const [name, setName] = useState(lead.name ?? "");
  const [phone, setPhone] = useState(lead.phone ?? "");
  const [email, setEmail] = useState(lead.email ?? "");
  const [requirement, setRequirement] = useState(lead.requirement ?? "");
  const [discussionNotes, setDiscussionNotes] = useState(lead.discussionNotes ?? "");
  const [quotationValue, setQuotationValue] = useState(String(lead.quotationValue ?? ""));
  const [pipeValue, setPipeValue] = useState(String(lead.pipeValue ?? ""));
  const [followUpAt, setFollowUpAt] = useState(defaultFollowUpLocal());
  const [noteDraft, setNoteDraft] = useState("");

  return (
    <div className="leads-drawer-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="leads-drawer"
        role="dialog"
        aria-label="Lead details"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="leads-drawer-head">
          <div>
            <h2>{lead.name || "Lead details"}</h2>
            <p className="leads-machine-muted">
              {leadCategoryLabel(lead.category)} · {STATUS_LABELS[lead.status]}
            </p>
          </div>
          <button type="button" className="btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </header>

        {canManage ? (
          <div className="leads-drawer-form">
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              Phone
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label>
              Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              Requirement
              <textarea value={requirement} onChange={(e) => setRequirement(e.target.value)} />
            </label>
            <label>
              Discussion notes
              <textarea
                value={discussionNotes}
                onChange={(e) => setDiscussionNotes(e.target.value)}
              />
            </label>
            <div className="leads-drawer-grid">
              <label>
                Quotation (₹)
                <input
                  type="number"
                  value={quotationValue}
                  onChange={(e) => setQuotationValue(e.target.value)}
                />
              </label>
              <label>
                Pipe value (₹)
                <input
                  type="number"
                  value={pipeValue}
                  onChange={(e) => setPipeValue(e.target.value)}
                />
              </label>
            </div>
            <button
              type="button"
              className="btn-primary"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await updateInboundLeadDetails({
                    leadId: lead.id,
                    name,
                    phone,
                    email,
                    requirement,
                    discussionNotes,
                    quotationValue,
                    pipeValue,
                  });
                })
              }
            >
              Save lead
            </button>
          </div>
        ) : null}

        <section className="leads-drawer-section">
          <h3>Follow-up</h3>
          <div className="leads-drawer-grid">
            <label>
              Next follow-up
              <input
                type="datetime-local"
                value={followUpAt}
                onChange={(e) => setFollowUpAt(e.target.value)}
              />
            </label>
          </div>
          {canManage ? (
            <button
              type="button"
              className="btn-secondary"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await scheduleInboundLeadFollowUp({
                    leadId: lead.id,
                    scheduledAt: followUpAt,
                    notes: noteDraft,
                  });
                })
              }
            >
              Schedule follow-up
            </button>
          ) : null}
        </section>

        <section className="leads-drawer-section">
          <h3>Quick note</h3>
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Discussion note for history log"
          />
          {canManage ? (
            <button
              type="button"
              className="btn-secondary"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await addInboundLeadNote(lead.id, noteDraft);
                  setNoteDraft("");
                })
              }
            >
              Add to history
            </button>
          ) : null}
        </section>

        <section className="leads-drawer-section">
          <h3>History & logs</h3>
          <ul className="leads-history-list">
            {lead.activities.length === 0 ? (
              <li className="leads-machine-muted">No activity yet.</li>
            ) : (
              lead.activities.map((item) => (
                <li key={item.id}>
                  <strong>{item.type.replaceAll("_", " ")}</strong>
                  <span>{item.body}</span>
                  <em>
                    {new Date(item.createdAt).toLocaleString("en-IN")} ·{" "}
                    {item.createdBy?.name || item.createdBy?.email || "System"}
                  </em>
                </li>
              ))
            )}
          </ul>
        </section>
      </aside>
    </div>
  );
}
