"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ExternalLink, Loader2, Pencil, Trash2, X } from "lucide-react";
import {
  addMonthlyServiceClientAction,
  deleteMonthlyServiceClientAction,
  searchMonthlyServiceLeadsAction,
  updateMonthlyServiceClientAction,
  type BillingActionState,
} from "@/app/app/clients/actions";
import { paiseToRupees } from "@/lib/billing/money";
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
  const [addOpen, setAddOpen] = useState(false);
  const [leadHits, setLeadHits] = useState<MonthlyServiceLeadOption[]>([]);
  const [leadSearching, setLeadSearching] = useState(false);
  const [selectedLead, setSelectedLead] = useState<MonthlyServiceLeadOption | null>(
    null,
  );

  function applyLead(lead: MonthlyServiceLeadOption) {
    setLeadId(lead.id);
    setSelectedLead(lead);
    setAddOpen(true);
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
    const q = query.trim();
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
  }, [query]);

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

      <div className="crm-client-groups-toolbar">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, phone, or email…"
          aria-label="Search leads by name, phone, or email"
          autoComplete="off"
        />
        <div className="crm-client-groups-toolbar-meta">
          <span className="crm-client-groups-count">
            {leadSearching
              ? "Searching Leads…"
              : query.trim().length >= 2
                ? `${leadHits.length} lead${leadHits.length === 1 ? "" : "s"} · ${visible.length} client${visible.length === 1 ? "" : "s"}`
                : `${clients.length} client${clients.length === 1 ? "" : "s"}`}
          </span>
        </div>
      </div>
      {query.trim().length >= 2 && !leadSearching && leadHits.length === 0 ? (
        <p className="ws-wa-empty">No lead matches that name, phone, or email.</p>
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

      <details
        className="ws-wa-add"
        open={addOpen}
        onToggle={(event) =>
          setAddOpen((event.currentTarget as HTMLDetailsElement).open)
        }
      >
        <summary className="ws-wa-group-summary">
          <span>
            <ChevronDown className="ws-wa-chevron" size={16} aria-hidden />
            Add monthly client
          </span>
          <small>From a lead · category · assign work</small>
        </summary>
        <form action={addAction} className="ws-billing-form">
          <input type="hidden" name="inboundLeadId" value={leadId} />
          {selectedLead ? (
            <p className="ws-wa-phone-match ws-billing-form-wide">
              {selectedLead.name}
              {selectedLead.phone ? ` · ${selectedLead.phone}` : ""}
              {selectedLead.email ? ` · ${selectedLead.email}` : ""}{" "}
              — filled from Leads.{" "}
              <button
                className="ws-lead-search-clear"
                type="button"
                onClick={clearLead}
              >
                Clear
              </button>
            </p>
          ) : (
            <p className="ws-billing-form-wide">
              <small>
                Search above by name, phone, or email — same as Leads — or fill
                the form for someone new.
              </small>
            </p>
          )}
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

      {clients.length === 0 && query.trim().length < 2 ? (
        <p className="ws-wa-empty">
          Search a lead above by name, phone, or email — same as Leads — then
          add them as a monthly client.
        </p>
      ) : searching && visible.length === 0 && clients.length > 0 ? (
        <p className="ws-wa-empty">No monthly client matches that search.</p>
      ) : clients.length > 0 && visible.length > 0 ? (
        <div className="ws-wa-groups">
          {groups.map(([categoryId, rows]) => (
            <MonthlyServiceGroup
              key={categoryId}
              title={rows[0]?.categoryLabel ?? categoryId}
              rows={rows}
              assignees={assignees}
              defaultOpen
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function dateInputValue(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function MonthlyServiceGroup({
  title,
  rows,
  assignees,
  defaultOpen = false,
}: {
  title: string;
  rows: MonthlyServiceClientRow[];
  assignees: MonthlyServiceAssigneeOption[];
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
          <MonthlyServiceCard key={row.id} row={row} assignees={assignees} />
        ))}
      </ul>
    </details>
  );
}

function MonthlyServiceCard({
  row,
  assignees,
}: {
  row: MonthlyServiceClientRow;
  assignees: MonthlyServiceAssigneeOption[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction, updating] = useActionState(
    updateMonthlyServiceClientAction,
    initial,
  );
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteMonthlyServiceClientAction,
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
          {editing ? (
            <form action={updateAction} className="ws-billing-form">
              <input name="clientId" type="hidden" value={row.id} />
              <label>
                Category
                <select name="category" defaultValue={row.category}>
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
                  defaultValue={row.name}
                />
              </label>
              <label>
                Company
                <input name="company" defaultValue={row.company ?? ""} />
              </label>
              <label>
                WhatsApp number
                <input
                  name="phone"
                  required
                  inputMode="tel"
                  defaultValue={row.phone}
                />
              </label>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  defaultValue={row.email ?? ""}
                />
              </label>
              <label>
                Monthly (₹)
                <input
                  name="monthlyRate"
                  inputMode="decimal"
                  defaultValue={String(paiseToRupees(row.monthlyRatePaise))}
                />
              </label>
              <label>
                Start
                <input
                  name="startedAt"
                  type="date"
                  defaultValue={dateInputValue(row.startedAt)}
                />
              </label>
              <label>
                Assign work to
                <select name="assignedToId" defaultValue={row.assignedToId ?? ""}>
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
                <input name="workNote" defaultValue={row.workNote ?? ""} />
              </label>
              <div className="ws-billing-actions ws-billing-form-wide">
                <button
                  className={`ws-billing-icon-btn${updating ? " is-busy" : ""}`}
                  disabled={updating}
                  type="submit"
                  title="Save"
                  aria-label="Save monthly client"
                >
                  {updating ? (
                    <Loader2 size={16} aria-hidden />
                  ) : (
                    <Check size={16} aria-hidden />
                  )}
                </button>
                <button
                  className="ws-billing-icon-btn"
                  type="button"
                  title="Cancel edit"
                  aria-label="Cancel edit"
                  onClick={() => setEditing(false)}
                >
                  <X size={16} aria-hidden />
                </button>
                {updateState.message ? (
                  <span className="crm-client-meta">{updateState.message}</span>
                ) : null}
              </div>
            </form>
          ) : (
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
          )}
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
            <button
              className="ws-billing-icon-btn"
              type="button"
              title="Edit"
              aria-label={`Edit ${row.name}`}
              onClick={() => setEditing((value) => !value)}
            >
              <Pencil size={16} aria-hidden />
            </button>
            <form
              action={deleteAction}
              onSubmit={(event) => {
                if (!window.confirm(`Delete ${row.name} from monthly clients?`)) {
                  event.preventDefault();
                }
              }}
            >
              <input name="clientId" type="hidden" value={row.id} />
              <button
                className={`ws-billing-icon-btn danger${deleting ? " is-busy" : ""}`}
                disabled={deleting}
                type="submit"
                title="Delete"
                aria-label={`Delete ${row.name}`}
              >
                {deleting ? (
                  <Loader2 size={16} aria-hidden />
                ) : (
                  <Trash2 size={16} aria-hidden />
                )}
              </button>
            </form>
            {deleteState.message ? (
              <span className="crm-client-meta">{deleteState.message}</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}
