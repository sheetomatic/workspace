"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BellOff, ChevronDown, ExternalLink } from "lucide-react";
import {
  addMonthlyServiceClientAction,
  cancelMonthlyServiceClientAction,
  searchMonthlyServiceLeadsAction,
  type BillingActionState,
} from "@/app/app/clients/actions";
import { crmLeadOpenHref } from "@/lib/leads/crm-open";
import { listLeadCategoryOptions } from "@/lib/leads/categories";
import type {
  MonthlyServiceAssigneeOption,
  MonthlyServiceClientRow,
  MonthlyServiceLeadOption,
} from "@/lib/billing/monthly-service-clients.shared";
import "@/components/saas/crm-client-groups.css";

const initial: BillingActionState = { ok: false, message: "" };
const categories = listLeadCategoryOptions();

function statusClass(value: string) {
  return value.toLowerCase().replace(/\s+/g, "_");
}

export function MonthlyServiceClientsPanel({
  clients,
  assignees,
}: {
  clients: MonthlyServiceClientRow[];
  assignees: MonthlyServiceAssigneeOption[];
}) {
  const [addState, addAction, adding] = useActionState(
    addMonthlyServiceClientAction,
    initial,
  );
  const [leadId, setLeadId] = useState("");
  const [category, setCategory] = useState("TRAINING_GWS");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [query, setQuery] = useState("");
  const [leadQuery, setLeadQuery] = useState("");
  const [leadHits, setLeadHits] = useState<MonthlyServiceLeadOption[]>([]);
  const [leadSearching, setLeadSearching] = useState(false);
  const [selectedLead, setSelectedLead] = useState<MonthlyServiceLeadOption | null>(
    null,
  );

  function applyLead(lead: MonthlyServiceLeadOption) {
    setLeadId(lead.id);
    setSelectedLead(lead);
    setLeadQuery("");
    setLeadHits([]);
    setName(lead.name);
    setCompany(lead.company ?? "");
    setPhone(lead.phone ?? "");
    setEmail(lead.email ?? "");
    setCategory(lead.category || "TRAINING_GWS");
    setAssignedToId(lead.assignedToId ?? "");
  }

  function clearLead() {
    setLeadId("");
    setSelectedLead(null);
    setLeadHits([]);
  }

  useEffect(() => {
    const q = leadQuery.trim();
    if (q.length < 2) {
      setLeadHits([]);
      setLeadSearching(false);
      return;
    }
    let cancelled = false;
    setLeadSearching(true);
    const timer = window.setTimeout(() => {
      void searchMonthlyServiceLeadsAction(q)
        .then((hits) => {
          if (cancelled) return;
          setLeadHits(hits);
          setLeadSearching(false);
        })
        .catch(() => {
          if (cancelled) return;
          setLeadHits([]);
          setLeadSearching(false);
        });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [leadQuery]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((row) => {
      const haystack = [
        row.name,
        row.company,
        row.email,
        row.phone,
        row.phoneLabel,
        row.categoryLabel,
        row.assignedToName,
        row.workNote,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [clients, query]);
  const searching = Boolean(query.trim());
  const groups = useMemo(() => {
    const map = new Map<string, MonthlyServiceClientRow[]>();
    for (const row of visible) {
      const list = map.get(row.category) ?? [];
      list.push(row);
      map.set(row.category, list);
    }
    return [...map.entries()].sort((a, b) =>
      (a[1][0]?.categoryLabel ?? "").localeCompare(b[1][0]?.categoryLabel ?? ""),
    );
  }, [visible]);
  const dueSoon = clients.filter((row) => row.dueSoon).length;

  return (
    <article className="saas-panel ws-billing-section ws-billing-section--monthly">
      <div className="saas-panel-head">
        <div>
          <h3>
            Monthly services{" "}
            <span className="ws-billing-pill">{clients.length}</span>
          </h3>
          <p>
            Add a client from a lead, pick a category like GWS training, set
            the monthly fee, and assign the work. No workspace login is created.
            {dueSoon ? ` ${dueSoon} due in 10 days.` : ""}
          </p>
        </div>
      </div>

      {clients.length > 0 ? (
        <div className="crm-client-groups-toolbar">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter monthly clients…"
            aria-label="Filter monthly service clients"
          />
          <div className="crm-client-groups-toolbar-meta">
            <span className="crm-client-groups-count">
              {searching
                ? `${visible.length} match${visible.length === 1 ? "" : "es"} of ${clients.length}`
                : `${clients.length} client${clients.length === 1 ? "" : "s"}`}
            </span>
          </div>
        </div>
      ) : null}

      <details className="ws-wa-add">
        <summary className="ws-wa-group-summary">
          <span>
            <ChevronDown className="ws-wa-chevron" size={16} aria-hidden />
            Add monthly client
          </span>
          <small>From a lead · category · assign work</small>
        </summary>
        <form action={addAction} className="ws-billing-form">
          <label className="ws-billing-form-wide">
            Search lead
            <input type="hidden" name="inboundLeadId" value={leadId} />
            <input
              type="search"
              value={leadQuery}
              onChange={(event) => setLeadQuery(event.target.value)}
              placeholder="Name, phone, or email…"
              aria-label="Search leads by name, phone, or email"
              autoComplete="off"
            />
            {leadSearching ? (
              <small>Searching CRM…</small>
            ) : leadQuery.trim().length >= 2 && leadHits.length === 0 ? (
              <small>No lead matches that name, phone, or email.</small>
            ) : null}
            {leadHits.length > 0 ? (
              <ul className="ws-lead-search-hits">
                {leadHits.map((lead) => (
                  <li key={lead.id}>
                    <button type="button" onClick={() => applyLead(lead)}>
                      <strong>{lead.name}</strong>
                      <span>
                        {[lead.phone, lead.email, lead.company]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {selectedLead ? (
              <small className="ws-wa-phone-match">
                {selectedLead.name}
                {selectedLead.phone ? ` · ${selectedLead.phone}` : ""}
                {selectedLead.email ? ` · ${selectedLead.email}` : ""}{" "}
                — name, phone, and category filled from CRM.{" "}
                <button
                  className="ws-lead-search-clear"
                  type="button"
                  onClick={clearLead}
                >
                  Clear
                </button>
              </small>
            ) : (
              <small>Leave empty to add a client who is not in Leads yet.</small>
            )}
          </label>
          <label>
            Category
            <select
              name="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {categories.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Client name
            <input
              name="name"
              required
              minLength={2}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Neha"
            />
          </label>
          <label>
            Company
            <input
              name="company"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              placeholder="Optional"
            />
          </label>
          <label>
            WhatsApp number
            <input
              name="phone"
              required
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="98765 43210"
            />
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Optional"
            />
          </label>
          <label>
            Monthly (₹)
            <input name="monthlyRate" inputMode="decimal" placeholder="15000" />
          </label>
          <label>
            Start
            <input name="startedAt" type="date" />
          </label>
          <label>
            Assign work to
            <select
              name="assignedToId"
              value={assignedToId}
              onChange={(event) => setAssignedToId(event.target.value)}
            >
              <option value="">Unassigned</option>
              {assignees.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
          <label className="ws-billing-form-wide">
            Work
            <input
              name="workNote"
              placeholder="e.g. GWS training — Sheets + AppSheet, 4 sessions"
            />
          </label>
          <div className="ws-billing-actions ws-billing-form-wide">
            <button className="saas-ws-action" disabled={adding} type="submit">
              {adding ? "Saving…" : "Add monthly client"}
            </button>
            {addState.message ? (
              <span
                className={
                  addState.ok ? "ws-billing-pill active" : "ws-billing-pill overdue"
                }
              >
                {addState.message}
              </span>
            ) : null}
          </div>
        </form>
      </details>

      {clients.length === 0 ? (
        <p className="ws-wa-empty">
          No monthly service clients yet. Pick a lead, choose GWS training (or
          another category), set the monthly fee, and assign the work.
        </p>
      ) : searching && visible.length === 0 ? (
        <p className="ws-wa-empty">No client matches that search.</p>
      ) : (
        <div className="ws-wa-groups">
          {groups.map(([categoryId, rows]) => (
            <MonthlyServiceGroup
              key={categoryId}
              title={rows[0]?.categoryLabel ?? categoryId}
              rows={rows}
              defaultOpen
            />
          ))}
        </div>
      )}
    </article>
  );
}

function MonthlyServiceGroup({
  title,
  rows,
  defaultOpen = false,
}: {
  title: string;
  rows: MonthlyServiceClientRow[];
  defaultOpen?: boolean;
}) {
  return (
    <details className="ws-wa-group" open={defaultOpen}>
      <summary className="ws-wa-group-summary">
        <span>
          <ChevronDown className="ws-wa-chevron" size={16} aria-hidden />
          {title} <span className="ws-billing-pill">{rows.length}</span>
        </span>
        <small>Monthly payment</small>
      </summary>
      <ul className="crm-client-groups-list">
        {rows.map((row) => (
          <MonthlyServiceCard key={row.id} row={row} />
        ))}
      </ul>
    </details>
  );
}

function MonthlyServiceCard({ row }: { row: MonthlyServiceClientRow }) {
  const [open, setOpen] = useState(false);
  const [cancelState, cancelAction, cancelling] = useActionState(
    cancelMonthlyServiceClientAction,
    initial,
  );

  return (
    <li className={`crm-client-card${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="crm-client-head"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="crm-client-avatar" aria-hidden>
          {(row.name.trim()[0] || "?").toUpperCase()}
        </span>
        <span className="crm-client-copy">
          <strong>{row.name}</strong>
          <span>
            {row.phoneLabel}
            {row.company ? ` · ${row.company}` : ""}
          </span>
          <span className="crm-client-meta">
            {row.categoryLabel} · {row.monthlyRateLabel}/mo · {row.daysLeftLabel}
            {row.assignedToName ? ` · ${row.assignedToName}` : ""}
          </span>
        </span>
        <span className={`ws-billing-pill ${statusClass(row.status)}`}>
          {row.status}
        </span>
        <ChevronDown className="crm-client-chevron" size={18} aria-hidden />
      </button>
      {open ? (
        <div className="crm-client-body">
          <dl className="ws-wa-detail">
            <div>
              <dt>Category</dt>
              <dd>{row.categoryLabel}</dd>
            </div>
            <div>
              <dt>Monthly</dt>
              <dd>{row.monthlyRateLabel}</dd>
            </div>
            <div>
              <dt>Next due</dt>
              <dd>
                {row.nextDueLabel}
                <div>{row.daysLeftLabel}</div>
              </dd>
            </div>
            <div>
              <dt>Assigned</dt>
              <dd>{row.assignedToName ?? "Unassigned"}</dd>
            </div>
            {row.workNote ? (
              <div className="ws-wa-notes">
                <dt>Work</dt>
                <dd>{row.workNote}</dd>
              </div>
            ) : null}
          </dl>
          <div className="ws-wa-icon-row">
            {row.inboundLeadId ? (
              <Link
                className="ws-billing-icon-btn"
                href={crmLeadOpenHref(row.inboundLeadId, { tab: "projects" })}
                title="Open lead"
                aria-label={`Open lead for ${row.name}`}
              >
                <ExternalLink size={16} aria-hidden />
              </Link>
            ) : null}
            {row.status !== "CANCELLED" ? (
              <form
                action={cancelAction}
                onSubmit={(event) => {
                  if (!window.confirm(`Stop monthly billing for ${row.name}?`)) {
                    event.preventDefault();
                  }
                }}
              >
                <input name="clientId" type="hidden" value={row.id} />
                <button
                  className={`ws-billing-icon-btn danger${cancelling ? " is-busy" : ""}`}
                  disabled={cancelling}
                  type="submit"
                  title="Stop monthly client"
                  aria-label="Stop monthly client"
                >
                  <BellOff size={16} aria-hidden />
                </button>
              </form>
            ) : null}
            {cancelState.message ? (
              <span className="crm-client-meta">{cancelState.message}</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}
