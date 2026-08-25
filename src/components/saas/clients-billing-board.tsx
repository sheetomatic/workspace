"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink } from "lucide-react";
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
        <ul className="crm-client-groups-list">
          {visible.map((row) => (
            <WorkspaceClientCard key={row.id} row={row} />
          ))}
        </ul>
      )}
    </>
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
          <dl className="ws-wa-detail">
            <div>
              <dt>Users</dt>
              <dd>
                {row.activeUsers}/{row.maxMembers}
              </dd>
            </div>
            <div>
              <dt>Monthly / plan</dt>
              <dd>
                {row.monthlyTotalLabel}
                <div>{row.planLabel}</div>
              </dd>
            </div>
            <div>
              <dt>Invoiced</dt>
              <dd>{row.invoicedLabel}</dd>
            </div>
            <div>
              <dt>Pending</dt>
              <dd>
                {row.pendingLabel}
                {row.pendingInvoices > 0 ? (
                  <div>
                    {row.pendingInvoices} open
                    {row.latestInvoice ? ` · ${row.latestInvoice.number}` : ""}
                  </div>
                ) : null}
              </dd>
            </div>
            <div>
              <dt>Received</dt>
              <dd>{row.receivedLabel}</dd>
            </div>
            <div>
              <dt>Renewal</dt>
              <dd>{row.renewalLabel}</dd>
            </div>
            {row.latestInvoice ? (
              <div>
                <dt>Latest invoice</dt>
                <dd>
                  <Link href={`/app/billing/invoices/${row.latestInvoice.id}`}>
                    {row.latestInvoice.number}
                  </Link>
                  <div>
                    {row.latestInvoice.totalLabel} · {row.latestInvoice.dueLabel}
                  </div>
                </dd>
              </div>
            ) : null}
          </dl>
          <div className="ws-wa-row-actions">
            <Link
              className="ws-billing-icon-btn"
              href={`/app/clients/${row.id}`}
              title="Open client"
              aria-label={`Open ${row.name}`}
            >
              <ExternalLink size={16} aria-hidden />
            </Link>
          </div>
          <ClientPlanActions
            addonLines={row.addonLines}
            availableAddons={row.availableAddons}
            billingPeriod={row.billingPeriod}
            clientName={row.name}
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
