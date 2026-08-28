"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { WorkspaceProduct } from "@prisma/client";
import { ClientPlanActions } from "@/components/saas/client-plan-actions";
import { SOLD_PRODUCT_ORDER } from "@/lib/billing/catalog";
import type { ClientBillingRow } from "@/lib/billing/queries";
import "@/components/saas/crm-client-groups.css";

function statusClass(value: string) {
  return value.toLowerCase().replace(/\s+/g, "_");
}

export function ClientsBillingBoard({ rows }: { rows: ClientBillingRow[] }) {
  if (rows.length === 0) {
    return (
      <article className="saas-panel">
        <p>No client workspaces yet. Create one from Team → Super Admin panel.</p>
      </article>
    );
  }

  const groups = SOLD_PRODUCT_ORDER.map((product) => ({
    product,
    rows: rows.filter((row) => row.product === product),
  })).filter((group) => group.rows.length > 0);

  return (
    <div className="ws-billing-groups">
      {groups.map((group) => (
        <article
          className={`saas-panel ws-billing-section ws-billing-section--${group.product.toLowerCase().replaceAll("_", "-")}`}
          key={group.product}
        >
          <div className="saas-panel-head">
            <div>
              <h3>
                {group.rows[0]?.productLabel ?? group.product}{" "}
                <span className="ws-billing-pill">{group.rows.length}</span>
              </h3>
              <p>
                One workspace per client. Click a row for plan, add-ons, and
                invoices. Each add-on bills at its plan rate on the next invoice.
              </p>
            </div>
          </div>
          <WorkspaceClientList rows={group.rows} />
        </article>
      ))}
    </div>
  );
}

function WorkspaceClientList({ rows }: { rows: ClientBillingRow[] }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const haystack = [
        row.name,
        row.slug,
        row.ownerEmail,
        row.ownerName,
        row.planLabel,
        row.productLabel,
        row.latestInvoice?.number,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query, rows]);
  const searching = Boolean(query.trim());
  const monthly = visible.filter((row) => row.billingPeriod === "MONTHLY");
  const annual = visible.filter((row) => row.billingPeriod !== "MONTHLY");

  return (
    <>
      {rows.length > 0 ? (
        <div className="crm-client-groups-toolbar">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter clients…"
            aria-label="Filter workspace clients"
          />
          <div className="crm-client-groups-toolbar-meta">
            <span className="crm-client-groups-count">
              {searching
                ? `${visible.length} match${visible.length === 1 ? "" : "es"} of ${rows.length}`
                : `${rows.length} client${rows.length === 1 ? "" : "s"}`}
            </span>
          </div>
        </div>
      ) : null}
      {visible.length === 0 ? (
        <p className="ws-wa-empty">No client matches that search.</p>
      ) : (
        <div className="ws-wa-groups">
          {monthly.length > 0 ? (
            <WorkspaceClientPeriodGroup
              title="Monthly"
              hint="Billed every month"
              rows={monthly}
              defaultOpen
            />
          ) : null}
          {annual.length > 0 ? (
            <WorkspaceClientPeriodGroup
              title="Annual"
              hint="Billed once a year"
              rows={annual}
              defaultOpen={monthly.length === 0}
            />
          ) : null}
        </div>
      )}
    </>
  );
}

function WorkspaceClientPeriodGroup({
  title,
  hint,
  rows,
  defaultOpen = false,
}: {
  title: string;
  hint: string;
  rows: ClientBillingRow[];
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
      <ul className="crm-client-groups-list">
        {rows.map((row) => (
          <WorkspaceClientCard key={row.id} row={row} />
        ))}
      </ul>
    </details>
  );
}

function WorkspaceClientCard({ row }: { row: ClientBillingRow[][number] }) {
  const [open, setOpen] = useState(false);
  const renewalAt =
    row.renewalAt instanceof Date
      ? row.renewalAt.toISOString().slice(0, 10)
      : row.renewalAt
        ? String(row.renewalAt).slice(0, 10)
        : "";

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
            {row.slug}
            {row.ownerEmail ? ` · ${row.ownerEmail}` : ""}
          </span>
          <span className="crm-client-meta">
            {row.billingPeriod === "MONTHLY" ? "Monthly" : "Annual"} ·{" "}
            {row.planLabel} · {row.activeUsers}/{row.maxMembers} users ·{" "}
            {row.renewalLabel}
          </span>
        </span>
        <span className={`ws-billing-pill ${statusClass(row.status)}`}>
          {row.status}
        </span>
        <ChevronDown className="crm-client-chevron" size={18} aria-hidden />
      </button>
      {open ? (
        <div className="crm-client-body">
          <div className="ws-client-stats" aria-label="Subscription summary">
            <div className="ws-client-stat">
              <span className="ws-client-stat-value">
                {row.activeUsers}/{row.maxMembers}
              </span>
              <span className="ws-client-stat-label">Users</span>
            </div>
            <div className="ws-client-stat">
              <span className="ws-client-stat-value">
                {row.billingPeriod === "MONTHLY" ? "Monthly" : "Annual"}
              </span>
              <span className="ws-client-stat-label">Billing</span>
            </div>
            <div className="ws-client-stat ws-client-stat--wide">
              <span className="ws-client-stat-value">{row.monthlyTotalLabel}</span>
              <span className="ws-client-stat-label">{row.planLabel}</span>
            </div>
            <div className="ws-client-stat">
              <span className="ws-client-stat-value">{row.invoicedLabel}</span>
              <span className="ws-client-stat-label">Invoiced</span>
            </div>
            <div className="ws-client-stat">
              <span className="ws-client-stat-value">{row.pendingLabel}</span>
              <span className="ws-client-stat-label">
                Pending
                {row.pendingInvoices > 0 ? ` · ${row.pendingInvoices} open` : ""}
              </span>
            </div>
            <div className="ws-client-stat">
              <span className="ws-client-stat-value">{row.receivedLabel}</span>
              <span className="ws-client-stat-label">Received</span>
            </div>
            <div className="ws-client-stat">
              <span className="ws-client-stat-value">{row.renewalLabel}</span>
              <span className="ws-client-stat-label">Renewal</span>
            </div>
          </div>
          {row.latestInvoice ? (
            <div className="ws-client-invoice">
              <span className="ws-client-invoice-label">Latest invoice</span>
              <Link href={`/app/billing/invoices/${row.latestInvoice.id}`}>
                {row.latestInvoice.number}
              </Link>
              <span className="ws-client-invoice-meta">
                {row.latestInvoice.totalLabel} · {row.latestInvoice.dueLabel}
              </span>
            </div>
          ) : null}
          <ClientPlanActions
            addonLines={row.addonLines}
            availableAddons={row.availableAddons}
            billingPeriod={row.billingPeriod}
            clientName={row.name}
            clientUrl={`/app/clients/${row.id}`}
            extraUserMonthlyPaise={row.extraUserMonthlyPaise}
            gstPercent={row.gstPercent}
            hasPlan={row.hasPlan}
            includedUsers={row.includedUsers}
            monthlyPaise={row.monthlyPaise}
            organizationId={row.id}
            renewalAt={renewalAt}
          />
        </div>
      ) : null}
    </li>
  );
}

export function productCounts(rows: ClientBillingRow[]) {
  const counts = {} as Record<WorkspaceProduct, number>;
  for (const row of rows) {
    counts[row.product] = (counts[row.product] ?? 0) + 1;
  }
  return counts;
}
