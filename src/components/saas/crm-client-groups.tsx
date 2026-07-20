"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ChevronDown, ExternalLink, MessageCircle } from "lucide-react";
import { sendLeadNurtureWhatsAppAction } from "@/app/app/leads/actions";
import {
  crmLeadOpenHref,
  type CrmLeadOpenTab,
} from "@/lib/leads/crm-open";
import { leadWhatsAppHref } from "@/lib/leads/contact-links";
import type { LeadNurtureEventId } from "@/lib/leads/nurture/events";
import "./crm-client-groups.css";

export type CrmClientGroupCell =
  | string
  | {
      primary: string;
      secondary?: string;
      className?: string;
      pill?: boolean;
    };

export type CrmClientGroupRow = {
  id: string;
  cells: CrmClientGroupCell[];
};

export type CrmClientGroup = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  inboundLeadId: string;
  summary: string;
  meta?: string;
  rows: CrmClientGroupRow[];
  /** Per-group nurture event override (e.g. projects due vs follow-up). */
  waEvent?: LeadNurtureEventId;
};

function renderCell(cell: CrmClientGroupCell) {
  if (typeof cell === "string") {
    return cell;
  }
  return (
    <span className={cell.className}>
      {cell.pill ? (
        <span className="leads-followup-type-pill">{cell.primary}</span>
      ) : (
        <span className={cell.secondary ? "ws-apple-cell-primary" : undefined}>
          {cell.primary}
        </span>
      )}
      {cell.secondary ? (
        <div className="leads-machine-muted">{cell.secondary}</div>
      ) : null}
    </span>
  );
}

export function CrmClientGroups({
  groups,
  columns,
  openTab,
  waEvent,
  canManage,
  emptyMessage,
  filterPlaceholder = "Filter clients…",
  noun = "client",
}: {
  groups: CrmClientGroup[];
  columns: string[];
  openTab: CrmLeadOpenTab;
  waEvent: LeadNurtureEventId;
  canManage: boolean;
  emptyMessage: string;
  filterPlaceholder?: string;
  noun?: string;
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(() =>
    groups.length === 1 ? new Set([groups[0]!.id]) : new Set(),
  );
  const [query, setQuery] = useState("");
  const [pendingLeadId, setPendingLeadId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    leadId: string;
    ok: boolean;
    message: string;
  } | null>(null);
  const [, startTransition] = useTransition();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((group) => {
      const haystack = [group.name, group.phone, group.email ?? "", group.summary]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [groups, query]);

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setOpenIds(new Set(visible.map((group) => group.id)));
  }

  function collapseAll() {
    setOpenIds(new Set());
  }

  function sendReminder(group: CrmClientGroup) {
    const event = group.waEvent ?? waEvent;
    setPendingLeadId(group.inboundLeadId);
    setFeedback(null);
    startTransition(async () => {
      const result = await sendLeadNurtureWhatsAppAction(
        group.inboundLeadId,
        event,
      );
      setPendingLeadId(null);
      setFeedback({
        leadId: group.inboundLeadId,
        ok: result.ok,
        message: result.message,
      });
    });
  }

  if (groups.length === 0) {
    return <p className="ws-apple-record-empty">{emptyMessage}</p>;
  }

  return (
    <div className="crm-client-groups">
      <div className="crm-client-groups-toolbar">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={filterPlaceholder}
          aria-label={filterPlaceholder}
        />
        <div className="crm-client-groups-toolbar-meta">
          <span className="crm-client-groups-count">
            {visible.length} {noun}
            {visible.length === 1 ? "" : "s"}
          </span>
          {visible.length > 1 ? (
            <>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={expandAll}
              >
                Expand all
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={collapseAll}
              >
                Collapse all
              </button>
            </>
          ) : null}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="ws-apple-record-empty">No clients match this filter.</p>
      ) : (
        <ul className="crm-client-groups-list">
          {visible.map((group) => {
            const open = openIds.has(group.id);
            const waHref = leadWhatsAppHref(group.phone, group.name);
            const groupFeedback =
              feedback?.leadId === group.inboundLeadId ? feedback : null;
            return (
              <li
                key={group.id}
                className={`crm-client-card${open ? " is-open" : ""}`}
              >
                <button
                  type="button"
                  className="crm-client-head"
                  aria-expanded={open}
                  onClick={() => toggle(group.id)}
                >
                  <span className="crm-client-avatar" aria-hidden>
                    {(group.name.trim()[0] || "?").toUpperCase()}
                  </span>
                  <span className="crm-client-copy">
                    <strong>{group.name}</strong>
                    <span>{group.phone || "No phone"}</span>
                    <span className="crm-client-meta">
                      {group.summary}
                      {group.meta ? ` · ${group.meta}` : ""}
                    </span>
                  </span>
                  <ChevronDown
                    className="crm-client-chevron"
                    size={18}
                    aria-hidden
                  />
                </button>

                {open ? (
                  <div className="crm-client-body">
                    <div className="crm-client-actions">
                      <Link
                        className="btn-secondary btn-sm"
                        href={crmLeadOpenHref(group.inboundLeadId, {
                          tab: openTab,
                        })}
                      >
                        Open
                        <ExternalLink size={14} aria-hidden />
                      </Link>
                      {canManage ? (
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          disabled={pendingLeadId === group.inboundLeadId}
                          onClick={() => sendReminder(group)}
                        >
                          {pendingLeadId === group.inboundLeadId
                            ? "Sending…"
                            : "WA reminder"}
                        </button>
                      ) : null}
                      {waHref ? (
                        <a
                          className="crm-client-wa-icon"
                          href={waHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open WhatsApp"
                          aria-label="Open WhatsApp"
                        >
                          <MessageCircle size={16} aria-hidden />
                        </a>
                      ) : null}
                      {groupFeedback ? (
                        <p
                          className={`crm-client-feedback${
                            groupFeedback.ok ? " is-ok" : " is-err"
                          }`}
                          role="status"
                        >
                          {groupFeedback.message}
                        </p>
                      ) : null}
                    </div>

                    {group.rows.length === 0 ? (
                      <p className="ws-apple-record-empty">No rows.</p>
                    ) : (
                      <div className="crm-submodule-table-wrap">
                        <table className="crm-submodule-table">
                          <thead>
                            <tr>
                              {columns.map((column) => (
                                <th key={column}>{column}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {group.rows.map((row) => (
                              <tr key={row.id}>
                                {row.cells.map((cell, index) => (
                                  <td key={`${row.id}-${index}`}>
                                    {renderCell(cell)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
