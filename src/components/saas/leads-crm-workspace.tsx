"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { MessageCircle, Phone, Trash2 } from "lucide-react";
import {
  bulkAssignInboundLeads,
  createManualInboundLead,
  deleteInboundLead,
  logLeadContactAction,
} from "@/app/app/leads/actions";
import { LeadsCsvImportButton } from "@/components/saas/leads-csv-import";
import { LeadDrawerPanel, type LeadDrawerData } from "@/components/saas/leads-drawer-panel";
import { LeadCategorySelect } from "@/components/saas/lead-category-select";
import { LeadStatusSelect } from "@/components/saas/lead-status-select";
import { LeadTemperatureBadge } from "@/components/saas/lead-temperature-badge";
import { LeadsKanbanBoard } from "@/components/saas/leads-kanban-board";
import { formatInr } from "@/lib/leads/categories";
import { LEAD_CHANNEL_LABELS } from "@/lib/leads/channels";
import type { LeadSourceChannel } from "@prisma/client";
import { leadTelHref, leadWhatsAppHref } from "@/lib/leads/contact-links";
import {
  LEADS_PAGE_SIZE,
  buildLeadsListQuery,
  type LeadsListSearchParams,
  type LeadsViewMode,
} from "@/lib/leads/list-params";
import { parseCrmDrawerTab, type CrmDrawerTab } from "@/lib/leads/crm-open";

type TeamMember = {
  user: { id: string; name: string | null; email: string };
};

type LeadRow = LeadDrawerData & {
  channel: LeadSourceChannel;
  capturedAt: string | null;
  modifiedAt: string | null;
  createdAt: string;
  pipeValue: string | number | null;
  followUps: Array<{
    id: string;
    scheduledAt: string;
    notes: string | null;
  }>;
};

type DuplicateMatch = {
  id: string;
  name: string | null;
};

function formatInquiryTime(capturedAt: string | null) {
  if (!capturedAt) {
    return "—";
  }
  const date = new Date(capturedAt);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
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

function assigneeLabel(lead: LeadRow) {
  return lead.assignedTo?.name?.trim() || lead.assignedTo?.email || "Unassigned";
}

function leadDeepLink(listParams: LeadsListSearchParams, leadId: string) {
  return `/app/leads?${buildLeadsListQuery(listParams, { leadId, page: "1" })}`;
}

function searchHref(listParams: LeadsListSearchParams, query: string) {
  return `/app/leads?${buildLeadsListQuery(listParams, {
    q: query.trim(),
    page: "1",
  })}`;
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
  currentUserId = null,
  sort,
  view = "list",
  serviceCatalog,
  organizationName,
  organizationLogoUrl,
  initialSelectedLeadId = null,
  initialTab = null,
  focusMode = false,
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
  /** Lets STAFF work leads assigned to them in the drawer. */
  currentUserId?: string | null;
  sort: "newest" | "oldest";
  view?: LeadsViewMode;
  serviceCatalog: Array<{
    id: string;
    serviceCategory: string;
    subCategory: string;
    unitPrice?: number | null;
    perUserCost?: number | null;
  }>;
  organizationName: string;
  organizationLogoUrl: string | null;
  initialSelectedLeadId?: string | null;
  initialTab?: CrmDrawerTab | string | null;
  /** Deep-link: show only the focused lead drawer (from Payments / Meetings / etc.). */
  focusMode?: boolean;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedLeadId);
  const [searchDraft, setSearchDraft] = useState(listParams.q ?? "");
  const [pending, startTransition] = useTransition();
  const [localLeads, setLocalLeads] = useState(leads);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createRequirement, setCreateRequirement] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createDuplicate, setCreateDuplicate] = useState<DuplicateMatch | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkAssigneeId, setBulkAssigneeId] = useState("");
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);
  const [bulkErr, setBulkErr] = useState<string | null>(null);

  useEffect(() => {
    setSelectedId(initialSelectedLeadId);
  }, [initialSelectedLeadId]);

  useEffect(() => {
    setLocalLeads(leads);
  }, [leads]);

  useEffect(() => {
    setSearchDraft(listParams.q ?? "");
  }, [listParams.q]);

  function applySearch(next: string) {
    const href = searchHref(listParams, next);
    startTransition(() => {
      router.push(href);
    });
  }

  useEffect(() => {
    const draft = searchDraft.trim();
    const committed = (listParams.q ?? "").trim();
    if (draft === committed) {
      return;
    }
    const timer = window.setTimeout(() => applySearch(searchDraft), 350);
    return () => window.clearTimeout(timer);
    // listParams identity changes every render from the server props object.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce on draft only
  }, [searchDraft]);

  // Focus mode: prefetch the list page so closing the drawer navigates fast.
  useEffect(() => {
    if (focusMode) {
      router.prefetch("/app/leads?period=all");
    }
  }, [focusMode, router]);

  function closeDrawer() {
    // Hide the drawer immediately — never make the user wait on navigation.
    setSelectedId(null);
    if (focusMode) {
      startTransition(() => {
        router.push("/app/leads?period=all");
      });
    }
  }

  function patchLead(id: string, patch: Partial<LeadRow>) {
    setLocalLeads((prev) =>
      prev.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead)),
    );
  }

  function toggleBulkLead(id: string) {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const showArchived = listParams.archived === "1";
  const isBoard = view === "board";
  const listViewHref = `/app/leads?${buildLeadsListQuery(listParams, { view: "", page: "1" })}`;
  const boardViewHref = `/app/leads?${buildLeadsListQuery(listParams, { view: "board", page: "1" })}`;

  const selected = useMemo(
    () => localLeads.find((lead) => lead.id === selectedId) ?? null,
    [localLeads, selectedId],
  );

  const committedSearch = (listParams.q ?? "").trim();
  const visibleLeads = localLeads;

  const sortHref =
    sort === "newest"
      ? `/app/leads?${buildLeadsListQuery(listParams, { sort: "oldest", page: "1" })}`
      : `/app/leads?${buildLeadsListQuery(listParams, { sort: "newest", page: "1" })}`;

  const archivedHref = showArchived
    ? `/app/leads?${buildLeadsListQuery(listParams, { archived: "", page: "1" })}`
    : `/app/leads?${buildLeadsListQuery(listParams, { archived: "1", page: "1" })}`;

  return (
    <div className={`leads-crm${focusMode ? " leads-crm--focus" : ""}`}>
      {!focusMode ? (
        <>
      <div className="leads-crm-toolbar">
        <div className="leads-crm-search" role="search">
          <input
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applySearch(searchDraft);
              }
            }}
            placeholder="Search CRM + Google Sheets by name, phone, email, or company…"
            aria-label="Search CRM and Google Sheets by name, phone, email, or company"
          />
          {searchDraft.trim() ? (
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => {
                setSearchDraft("");
                applySearch("");
              }}
            >
              Clear
            </button>
          ) : null}
        </div>
        <div className="leads-crm-toolbar-actions">
          <span className="leads-crm-period">{periodLabel}</span>
          <div className="leads-view-toggle" role="group" aria-label="Leads view">
            <Link
              className={`btn-secondary btn-sm${!isBoard ? " is-active" : ""}`}
              href={listViewHref}
            >
              List
            </Link>
            <Link
              className={`btn-secondary btn-sm${isBoard ? " is-active" : ""}`}
              href={boardViewHref}
            >
              Board
            </Link>
          </div>
          <Link
            className={`btn-secondary btn-sm${showArchived ? " is-active" : ""}`}
            href={archivedHref}
          >
            {showArchived ? "Hide archived" : "Show archived"}
          </Link>
          <Link className="btn-secondary btn-sm" href={sortHref}>
            {sort === "newest" ? "Newest" : "Oldest"}
          </Link>
          {canManage ? (
            <>
              <LeadsCsvImportButton />
              {!isBoard ? (
                <button
                  type="button"
                  className={`btn-secondary btn-sm${bulkMode ? " is-active" : ""}`}
                  onClick={() => {
                    setBulkMode((open) => !open);
                    setBulkSelected(new Set());
                    setBulkMsg(null);
                    setBulkErr(null);
                  }}
                >
                  {bulkMode ? "Done selecting" : "Bulk assign"}
                </button>
              ) : null}
            </>
          ) : null}
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={() => {
              setShowCreate((open) => !open);
              setCreateError(null);
              setCreateDuplicate(null);
            }}
          >
            {showCreate ? "Cancel" : "Add lead"}
          </button>
          <div className="leads-crm-pager">
            <span className="leads-crm-count">
              {committedSearch
                ? pending
                  ? "Searching…"
                  : `${total} match${total === 1 ? "" : "es"}`
                : isBoard
                  ? `${Math.min(localLeads.length, total)} of ${total} on board`
                  : `${total} leads · ${LEADS_PAGE_SIZE} / page · p${page}/${totalPages}`}
            </span>
            {!isBoard && page > 1 ? (
              <Link
                className="btn-secondary btn-sm"
                href={`/app/leads?${buildLeadsListQuery(listParams, { page: String(page - 1) })}`}
              >
                Previous
              </Link>
            ) : null}
            {!isBoard && page < totalPages ? (
              <Link
                className="btn-primary btn-sm"
                href={`/app/leads?${buildLeadsListQuery(listParams, { page: String(page + 1) })}`}
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {showCreate ? (
        <form
          className="leads-create-form"
          onSubmit={(event) => {
            event.preventDefault();
            setCreateError(null);
            setCreateDuplicate(null);
            const formData = new FormData();
            formData.set("name", createName);
            formData.set("phone", createPhone);
            formData.set("email", createEmail);
            formData.set("requirement", createRequirement);
            startTransition(async () => {
              const result = await createManualInboundLead(formData);
              if (!result.ok) {
                setCreateError(result.message ?? "Could not create lead.");
                if ("duplicate" in result && result.duplicate && result.matches?.[0]) {
                  setCreateDuplicate({
                    id: result.matches[0].id,
                    name: result.matches[0].name,
                  });
                }
                return;
              }
              setShowCreate(false);
              setCreateName("");
              setCreatePhone("");
              setCreateEmail("");
              setCreateRequirement("");
              if (result.leadId) {
                setSelectedId(result.leadId);
                router.push(leadDeepLink(listParams, result.leadId));
              } else {
                router.refresh();
              }
            });
          }}
        >
          <label>
            Name
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Lead name"
            />
          </label>
          <label>
            Phone
            <input
              value={createPhone}
              onChange={(e) => setCreatePhone(e.target.value)}
              placeholder="10-digit mobile"
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              placeholder="Optional"
            />
          </label>
          <label className="leads-create-requirement">
            Requirement
            <input
              value={createRequirement}
              onChange={(e) => setCreateRequirement(e.target.value)}
              placeholder="What do they need?"
            />
          </label>
          <button type="submit" className="btn-primary btn-sm" disabled={pending}>
            Create
          </button>
          {createError ? (
            <div className="leads-duplicate-alert" role="alert">
              <p>{createError}</p>
              {createDuplicate ? (
                <div className="leads-duplicate-alert-actions">
                  <Link
                    href={leadDeepLink(listParams, createDuplicate.id)}
                    onClick={() => setSelectedId(createDuplicate.id)}
                  >
                    Open existing lead
                    {createDuplicate.name ? ` · ${createDuplicate.name}` : ""}
                  </Link>
                  <span className="leads-machine-muted">
                    Open it to merge from the lead drawer if needed.
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
        </form>
      ) : null}

      {bulkMode && canManage && !isBoard ? (
        <div className="leads-bulk-bar" role="toolbar" aria-label="Bulk assign leads">
          <span className="leads-bulk-count">
            {bulkSelected.size} selected
          </span>
          <select
            value={bulkAssigneeId}
            onChange={(event) => setBulkAssigneeId(event.target.value)}
            aria-label="Assign selected leads to"
          >
            <option value="">Assign to…</option>
            {teamMembers.map((member) => (
              <option key={member.user.id} value={member.user.id}>
                {member.user.name || member.user.email}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={pending || bulkSelected.size === 0 || !bulkAssigneeId}
            onClick={() => {
              setBulkMsg(null);
              setBulkErr(null);
              startTransition(async () => {
                const result = await bulkAssignInboundLeads(
                  [...bulkSelected],
                  bulkAssigneeId,
                );
                if (!result.ok) {
                  setBulkErr(result.message ?? "Could not assign leads.");
                  return;
                }
                setBulkMsg(
                  `${result.count} lead${result.count === 1 ? "" : "s"} assigned to ${result.assigneeName}. Summary sent to them.`,
                );
                setBulkSelected(new Set());
                router.refresh();
              });
            }}
          >
            {pending
              ? "Assigning…"
              : `Assign ${bulkSelected.size || ""}`.trim()}
          </button>
          {bulkMsg ? <span className="leads-bulk-msg">{bulkMsg}</span> : null}
          {bulkErr ? (
            <span className="leads-bulk-err" role="alert">
              {bulkErr}
            </span>
          ) : null}
        </div>
      ) : null}

      {isBoard ? (
        visibleLeads.length === 0 ? (
          <div className="leads-empty-state leads-board-empty">
            <p className="leads-machine-muted">
              {committedSearch
                ? pending
                  ? "Searching all leads…"
                  : "No leads match this search."
                : "No leads match this filter."}
            </p>
            {workspaceTotal > 0 && period !== "all" && !searchDraft.trim() ? (
              <p className="leads-machine-muted">
                {workspaceTotal} in workspace.{" "}
                <Link href="/app/leads?period=all&view=board">View all</Link>
              </p>
            ) : null}
          </div>
        ) : (
          // Staff boards only contain their assigned leads, so stage drag is
          // safe — the server still checks per-lead permission.
          <LeadsKanbanBoard
            canManage
            leads={visibleLeads}
            onOpenLead={setSelectedId}
          />
        )
      ) : (
      <div className="leads-crm-table-wrap">
        <table className="leads-crm-table leads-crm-table-pro">
          <thead>
            <tr>
              {bulkMode && canManage ? (
                <th className="leads-col-select">
                  <input
                    type="checkbox"
                    aria-label="Select all visible leads"
                    checked={
                      visibleLeads.length > 0 &&
                      visibleLeads.every((lead) => bulkSelected.has(lead.id))
                    }
                    onChange={(event) => {
                      if (event.target.checked) {
                        setBulkSelected(
                          new Set(visibleLeads.map((lead) => lead.id)),
                        );
                      } else {
                        setBulkSelected(new Set());
                      }
                    }}
                  />
                </th>
              ) : null}
              <th className="leads-row-lead">Lead</th>
              <th>Assignee</th>
              <th>Inquiry time</th>
              <th>Lead Source</th>
              <th>Category</th>
              <th>Status</th>
              <th className="leads-col-quoted">Quoted</th>
              <th className="leads-col-actions" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {visibleLeads.length === 0 ? (
              <tr>
                <td colSpan={bulkMode && canManage ? 9 : 8}>
                  <div className="leads-empty-state">
                    <p className="leads-machine-muted">
                      {committedSearch
                        ? pending
                          ? "Searching all leads…"
                          : "No leads match this search."
                        : "No leads match this filter."}
                    </p>
                    {workspaceTotal > 0 && period !== "all" && !searchDraft.trim() ? (
                      <p className="leads-machine-muted">
                        {workspaceTotal} in workspace.{" "}
                        <Link href="/app/leads?period=all">View all</Link>
                      </p>
                    ) : null}
                    {workspaceTotal === 0 && !searchDraft.trim() ? (
                      <p className="leads-machine-muted">
                        <Link href="/app/leads/settings">Setup</Link> Google Sheets to import.
                      </p>
                    ) : null}
                  </div>
                </td>
              </tr>
            ) : (
              visibleLeads.map((lead) => {
                const quoted = quotationAmount(lead);
                const telHref = leadTelHref(lead.phone);
                const waHref = leadWhatsAppHref(lead.phone, lead.name);
                const primary = leadPrimaryLabel(lead);
                const secondary = leadSecondaryLabel(lead);
                const isArchived = Boolean(lead.archivedAt);
                return (
                  <tr
                    key={lead.id}
                    className={[
                      "leads-crm-row",
                      selectedId === lead.id ? "is-selected" : "",
                      isArchived ? "is-archived" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => {
                      if (bulkMode && canManage) {
                        toggleBulkLead(lead.id);
                        return;
                      }
                      setSelectedId(lead.id);
                    }}
                  >
                    {bulkMode && canManage ? (
                      <td
                        className="leads-col-select"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Select ${primary}`}
                          checked={bulkSelected.has(lead.id)}
                          onChange={() => toggleBulkLead(lead.id)}
                        />
                      </td>
                    ) : null}
                    <td className="leads-row-lead">
                      <div className="leads-row-lead-copy">
                        <strong className="leads-row-name">
                          {primary}
                          {!lead.modifiedAt ? (
                            <span className="leads-untouched-pill" title="Not yet worked by team">
                              {" "}
                              · New
                            </span>
                          ) : null}
                          {isArchived ? (
                            <span className="leads-archived-pill" title="Archived">
                              {" "}
                              · Archived
                            </span>
                          ) : null}
                        </strong>
                        <div className="leads-row-meta">
                          {secondary ? (
                            <span className="leads-row-contact">{secondary}</span>
                          ) : null}
                          <LeadTemperatureBadge
                            compact
                            score={lead.score}
                            temperature={lead.temperature}
                          />
                        </div>
                      </div>
                    </td>
                    <td
                      className={`leads-row-assignee${lead.assignedTo ? "" : " is-empty"}`}
                    >
                      {assigneeLabel(lead)}
                    </td>
                    <td className="leads-row-time">
                      {formatInquiryTime(lead.capturedAt)}
                    </td>
                    <td className="leads-row-source">
                      <span className="leads-source-pill">
                        {LEAD_CHANNEL_LABELS[lead.channel] ?? lead.channel}
                      </span>
                    </td>
                    <td className="leads-row-category">
                      {/* Staff rows are already scoped to their assigned leads;
                          the server still enforces per-lead permission. */}
                      <LeadCategorySelect
                        disabled={false}
                        leadId={lead.id}
                        value={lead.category}
                      />
                    </td>
                    <td className="leads-row-status">
                      <LeadStatusSelect
                        disabled={false}
                        leadId={lead.id}
                        value={lead.status}
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
      )}

      {!isBoard && totalPages > 1 ? (
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
      ) : total > localLeads.length && !committedSearch ? (
        <p className="leads-machine-muted leads-board-cap-note">
          Showing first {localLeads.length} of {total}. Narrow the period or filter, or use List
          for pagination.
        </p>
      ) : null}
        </>
      ) : null}

      {selected ? (
        <div
          className="leads-drawer-backdrop"
          role="presentation"
          onClick={closeDrawer}
        >
          <LeadDrawerPanel
            key={selected.id}
            canManage={canManage}
            currentUserId={currentUserId}
            initialTab={parseCrmDrawerTab(initialTab) ?? initialTab}
            lead={selected}
            listParams={listParams}
            onClose={closeDrawer}
            onDeleted={closeDrawer}
            onLeadPatched={patchLead}
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
