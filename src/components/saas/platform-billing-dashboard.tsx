"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink, FileDown } from "lucide-react";
import { PageHeader } from "@/components/saas/page-header";
import { formatInrPaise } from "@/lib/billing/money";
import type { PlatformInvoiceRow } from "@/lib/billing/queries";
import "@/components/saas/crm-client-groups.css";

function statusClass(value: string) {
  return value.toLowerCase().replace(/\s+/g, "_");
}

export function PlatformBillingDashboard({
  totals,
  invoices,
}: {
  totals: {
    invoicedPaise: number;
    pendingPaise: number;
    receivedPaise: number;
    pendingInvoices: number;
    onHold: number;
  };
  invoices: PlatformInvoiceRow[];
}) {
  return (
    <div className="saas-page ws-billing-page">
      <PageHeader
        title="Billing"
        description="Invoices and collections across client workspaces. Plans, add-ons, and WhatsApp API clients live on Clients."
        actions={
          <Link className="btn-cta" href="/app/clients">
            View clients
          </Link>
        }
      />
      <div className="ws-billing-kpis">
        <div className="ws-billing-kpi ws-billing-kpi--invoiced">
          <span>Invoiced</span>
          <strong>{formatInrPaise(totals.invoicedPaise)}</strong>
        </div>
        <div className="ws-billing-kpi ws-billing-kpi--pending">
          <span>Pending</span>
          <strong>
            {formatInrPaise(totals.pendingPaise)}
            <small>
              {totals.pendingInvoices} invoice
              {totals.pendingInvoices === 1 ? "" : "s"}
            </small>
          </strong>
        </div>
        <div className="ws-billing-kpi ws-billing-kpi--received">
          <span>Received</span>
          <strong>{formatInrPaise(totals.receivedPaise)}</strong>
        </div>
        <div className="ws-billing-kpi ws-billing-kpi--hold">
          <span>On hold</span>
          <strong>{totals.onHold}</strong>
        </div>
        <div className="ws-billing-kpi ws-billing-kpi--clients">
          <span>Invoices</span>
          <strong>{invoices.length}</strong>
        </div>
      </div>
      {invoices.length === 0 ? (
        <article className="saas-panel">
          <p>
            No invoices yet. Open a workspace on Clients and generate the first
            invoice from that client.
          </p>
        </article>
      ) : (
        <article className="saas-panel">
          <div className="saas-panel-head">
            <div>
              <h3>
                Invoices{" "}
                <span className="ws-billing-pill">{invoices.length}</span>
              </h3>
              <p>Click a row for period, paid amount, and download.</p>
            </div>
          </div>
          <InvoiceList invoices={invoices} />
        </article>
      )}
    </div>
  );
}

function InvoiceList({ invoices }: { invoices: PlatformInvoiceRow[] }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((row) => {
      const haystack = [row.number, row.clientName, row.clientSlug, row.status]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [invoices, query]);
  const searching = Boolean(query.trim());
  const visibleOverdue = visible.filter((row) => row.group === "OVERDUE");
  const visibleOpen = visible.filter((row) => row.group === "OPEN");
  const visiblePaid = visible.filter((row) => row.group === "PAID");

  return (
    <>
      <div className="crm-client-groups-toolbar">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter invoices…"
          aria-label="Filter invoices"
        />
        <div className="crm-client-groups-toolbar-meta">
          <span className="crm-client-groups-count">
            {searching
              ? `${visible.length} match${visible.length === 1 ? "" : "es"} of ${invoices.length}`
              : `${invoices.length} invoice${invoices.length === 1 ? "" : "s"}`}
          </span>
        </div>
      </div>
      {searching && visible.length === 0 ? (
        <p className="ws-wa-empty">No invoice matches that search.</p>
      ) : (
        <div className="ws-wa-groups">
          {visibleOverdue.length > 0 ? (
            <InvoiceGroup
              title="Overdue"
              hint="Past due — collect first"
              rows={visibleOverdue}
              defaultOpen
            />
          ) : null}
          {visibleOpen.length > 0 ? (
            <InvoiceGroup
              title="Open"
              hint="Draft or sent — not paid yet"
              rows={visibleOpen}
              defaultOpen
            />
          ) : null}
          {visiblePaid.length > 0 ? (
            <InvoiceGroup
              title="Paid"
              hint="Collected"
              rows={visiblePaid}
              defaultOpen={searching}
            />
          ) : null}
        </div>
      )}
    </>
  );
}

function InvoiceGroup({
  title,
  hint,
  rows,
  defaultOpen = false,
}: {
  title: string;
  hint: string;
  rows: PlatformInvoiceRow[];
  defaultOpen?: boolean;
}) {
  return (
    <details className="ws-wa-group" open={defaultOpen}>
      <summary className="ws-wa-group-summary">
        <span>
          <ChevronDown className="ws-wa-chevron" size={16} aria-hidden />
          {title} <span className="ws-billing-pill">{rows.length}</span>
        </span>
        <small>{hint}</small>
      </summary>
      {rows.length === 0 ? (
        <p className="ws-wa-empty">No {title.toLowerCase()} invoices.</p>
      ) : (
        <ul className="crm-client-groups-list">
          {rows.map((row) => (
            <InvoiceCard key={row.id} row={row} />
          ))}
        </ul>
      )}
    </details>
  );
}

function InvoiceCard({ row }: { row: PlatformInvoiceRow }) {
  const [open, setOpen] = useState(false);

  return (
    <li className={`crm-client-card${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="crm-client-head"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="crm-client-avatar" aria-hidden>
          {(row.clientName.trim()[0] || "?").toUpperCase()}
        </span>
        <span className="crm-client-copy">
          <strong>{row.clientName}</strong>
          <span>
            {row.number} · {row.dueAmountLabel} due {row.dueDateLabel}
          </span>
          <span className="crm-client-meta">{row.periodLabel}</span>
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
              <dt>Invoice</dt>
              <dd>{row.number}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>{row.totalLabel}</dd>
            </div>
            <div>
              <dt>Paid</dt>
              <dd>{row.paidLabel}</dd>
            </div>
            <div>
              <dt>Still due</dt>
              <dd>{row.dueAmountLabel}</dd>
            </div>
            <div>
              <dt>Issued</dt>
              <dd>{row.issuedLabel}</dd>
            </div>
            <div>
              <dt>Due date</dt>
              <dd>{row.dueDateLabel}</dd>
            </div>
            <div>
              <dt>Period</dt>
              <dd>{row.periodLabel}</dd>
            </div>
            <div>
              <dt>Reminders</dt>
              <dd>{row.reminderCount}</dd>
            </div>
          </dl>
          <div className="ws-wa-icon-row">
            <Link
              className="ws-billing-icon-btn"
              href={`/app/billing/invoices/${row.id}`}
              title="Download invoice"
              aria-label={`Download ${row.number}`}
            >
              <FileDown size={16} aria-hidden />
            </Link>
            <Link
              className="ws-billing-icon-btn"
              href={`/app/clients/${row.organizationId}`}
              title="Open client"
              aria-label={`Open ${row.clientName}`}
            >
              <ExternalLink size={16} aria-hidden />
            </Link>
          </div>
        </div>
      ) : null}
    </li>
  );
}
