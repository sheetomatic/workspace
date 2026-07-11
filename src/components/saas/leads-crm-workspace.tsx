"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { MessageCircle, Phone, Trash2 } from "lucide-react";
import {
  createManualInboundLead,
  deleteInboundLead,
  logLeadContactAction,
} from "@/app/app/leads/actions";
import { LeadsCsvImportButton } from "@/components/saas/leads-csv-import";
import { LeadDrawerPanel, type LeadDrawerData } from "@/components/saas/leads-drawer-panel";
import { LeadDeliveryStagePill } from "@/components/saas/lead-delivery-journey";
import { LeadCategorySelect } from "@/components/saas/lead-category-select";
import { LeadStatusSelect } from "@/components/saas/lead-status-select";
import { LeadTemperatureBadge } from "@/components/saas/lead-temperature-badge";
import { formatInr } from "@/lib/leads/categories";
import { LEAD_CHANNEL_LABELS } from "@/lib/leads/channels";
import type { LeadSourceChannel } from "@prisma/client";
import { leadTelHref, leadWhatsAppHref } from "@/lib/leads/contact-links";
import { buildLeadsListQuery, type LeadsListSearchParams } from "@/lib/leads/list-params";

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

function leadDeepLink(listParams: LeadsListSearchParams, leadId: string) {
  return `/app/leads?${buildLeadsListQuery(listParams, { leadId, page: "1" })}`;
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
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedLeadId);
  const [searchDraft, setSearchDraft] = useState(listParams.q ?? "");
  const [pending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createRequirement, setCreateRequirement] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createDuplicate, setCreateDuplicate] = useState<DuplicateMatch | null>(null);

  const showArchived = listParams.archived === "1";

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

  const archivedHref = showArchived
    ? `/app/leads?${buildLeadsListQuery(listParams, { archived: "", page: "1" })}`
    : `/app/leads?${buildLeadsListQuery(listParams, { archived: "1", page: "1" })}`;

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
            </>
          ) : null}
          <span className="leads-crm-count">
            {total} leads · p{page}/{totalPages}
          </span>
        </div>
      </div>

      {showCreate && canManage ? (
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
                <Link
                  href={leadDeepLink(listParams, createDuplicate.id)}
                  onClick={() => setSelectedId(createDuplicate.id)}
                >
                  Open existing lead
                  {createDuplicate.name ? ` · ${createDuplicate.name}` : ""}
                </Link>
              ) : null}
            </div>
          ) : null}
        </form>
      ) : null}

      <div className="leads-crm-table-wrap">
        <table className="leads-crm-table leads-crm-table-pro">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Inquiry time</th>
              <th>Lead Source</th>
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
                <td colSpan={8}>
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
                    onClick={() => setSelectedId(lead.id)}
                  >
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
                    <td className="leads-row-time">
                      {formatInquiryTime(lead.capturedAt)}
                    </td>
                    <td className="leads-row-source">
                      <span className="leads-source-pill">
                        {LEAD_CHANNEL_LABELS[lead.channel] ?? lead.channel}
                      </span>
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
            key={selected.id}
            canManage={canManage}
            lead={selected}
            listParams={listParams}
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
