"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { InboundLeadStatus } from "@prisma/client";
import { updateInboundLeadStatus } from "@/app/app/leads/actions";
import { LeadTemperatureBadge } from "@/components/saas/lead-temperature-badge";
import { formatInr } from "@/lib/leads/categories";
import {
  LEAD_STATUS_ORDER,
  leadStatusLabel,
} from "@/lib/leads/status-labels";

export type KanbanLeadCard = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  status: InboundLeadStatus;
  score: number | null;
  temperature: "HOT" | "WARM" | "COLD" | null;
  pipeValue: string | number | null;
  quotationValue: string | number | null;
  archivedAt: string | null;
};

function cardTitle(lead: KanbanLeadCard) {
  return (
    lead.name?.trim() ||
    lead.company?.trim() ||
    lead.phone?.trim() ||
    lead.email?.trim() ||
    "Unnamed lead"
  );
}

function quotedAmount(lead: KanbanLeadCard) {
  const raw = lead.quotationValue ?? lead.pipeValue;
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function LeadsKanbanBoard({
  leads,
  canManage,
  onOpenLead,
}: {
  leads: KanbanLeadCard[];
  canManage: boolean;
  onOpenLead: (leadId: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [boardLeads, setBoardLeads] = useState(leads);
  const [dragOverStatus, setDragOverStatus] = useState<InboundLeadStatus | null>(
    null,
  );

  useEffect(() => {
    setBoardLeads(leads);
  }, [leads]);

  const columns = useMemo(() => {
    const map = new Map<InboundLeadStatus, KanbanLeadCard[]>();
    for (const status of LEAD_STATUS_ORDER) {
      map.set(status, []);
    }
    for (const lead of boardLeads) {
      if (lead.archivedAt) continue;
      const bucket = map.get(lead.status);
      if (bucket) {
        bucket.push(lead);
      } else {
        map.get("NEW")!.push(lead);
      }
    }
    return LEAD_STATUS_ORDER.map((status) => ({
      status,
      label: leadStatusLabel(status),
      leads: map.get(status) ?? [],
    }));
  }, [boardLeads]);

  function moveLead(leadId: string, nextStatus: InboundLeadStatus) {
    if (!canManage) return;
    const current = boardLeads.find((l) => l.id === leadId);
    if (!current || current.status === nextStatus) return;
    const previousStatus = current.status;

    setBoardLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId ? { ...lead, status: nextStatus } : lead,
      ),
    );

    startTransition(async () => {
      const result = await updateInboundLeadStatus(leadId, nextStatus);
      if (!result.ok) {
        setBoardLeads((prev) =>
          prev.map((lead) =>
            lead.id === leadId ? { ...lead, status: previousStatus } : lead,
          ),
        );
      }
    });
  }

  return (
    <div className="leads-kanban" aria-busy={pending}>
      <div className="leads-kanban-scroller">
        {columns.map((col) => (
          <section
            key={col.status}
            className={`leads-kanban-column${
              dragOverStatus === col.status ? " is-drop-target" : ""
            }`}
            onDragOver={(event) => {
              if (!canManage) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setDragOverStatus(col.status);
            }}
            onDragLeave={() => {
              setDragOverStatus((prev) => (prev === col.status ? null : prev));
            }}
            onDrop={(event) => {
              if (!canManage) return;
              event.preventDefault();
              setDragOverStatus(null);
              const leadId = event.dataTransfer.getData("text/lead-id");
              if (leadId) {
                moveLead(leadId, col.status);
              }
            }}
          >
            <header className="leads-kanban-column-head">
              <h3>{col.label}</h3>
              <span className="leads-kanban-count">{col.leads.length}</span>
            </header>
            <div className="leads-kanban-cards">
              {col.leads.length === 0 ? (
                <p className="leads-kanban-empty">Drop leads here</p>
              ) : (
                col.leads.map((lead) => {
                  const quoted = quotedAmount(lead);
                  return (
                    <article
                      key={lead.id}
                      className="leads-kanban-card"
                      draggable={canManage}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/lead-id", lead.id);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={() => onOpenLead(lead.id)}
                    >
                      <strong className="leads-kanban-card-title">
                        {cardTitle(lead)}
                      </strong>
                      {lead.company?.trim() && lead.name?.trim() ? (
                        <span className="leads-kanban-card-meta">
                          {lead.company.trim()}
                        </span>
                      ) : null}
                      <div className="leads-kanban-card-footer">
                        <LeadTemperatureBadge
                          compact
                          score={lead.score}
                          temperature={lead.temperature}
                        />
                        {quoted != null ? (
                          <span className="leads-kanban-card-value">
                            {formatInr(quoted)}
                          </span>
                        ) : null}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
