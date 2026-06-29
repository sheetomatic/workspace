"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { InboundLeadStatus, LeadSourceChannel } from "@prisma/client";
import {
  assignInboundLead,
  bridgeLeadToFmsAction,
  completeInboundLeadFollowUp,
  scheduleInboundLeadFollowUp,
  updateInboundLeadStatus,
} from "@/app/app/leads/actions";
import {
  LEAD_CHANNEL_LABELS,
  LEAD_DASHBOARD_SOURCE_FILTERS,
  LEAD_SOURCE_PRIORITY_CHANNEL,
  isLeadSourceComingSoon,
  type LeadDashboardSourceFilter,
} from "@/lib/leads/channels";
import { fmsInstanceHref } from "@/lib/fms/navigation";

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

type LeadRow = {
  id: string;
  channel: LeadSourceChannel;
  name: string | null;
  phone: string | null;
  email: string | null;
  requirement: string | null;
  sourceDetail: string | null;
  status: InboundLeadStatus;
  nextFollowUpAt: Date | null;
  assignedTo: { id: string; name: string | null; email: string } | null;
  fmsInstance: { id: string; referenceLabel: string | null } | null;
  fmsStep: {
    activeStep: string | null;
    progress: string;
    instanceStatus: string;
  } | null;
  followUps: Array<{
    id: string;
    scheduledAt: Date;
    notes: string | null;
    assignee: { id: string; name: string | null; email: string } | null;
  }>;
  capturedAt: Date | null;
  createdAt: Date;
};

type FollowUpRow = {
  id: string;
  scheduledAt: Date;
  notes: string | null;
  lead: {
    id: string;
    name: string | null;
    phone: string | null;
    channel: LeadSourceChannel;
    status: InboundLeadStatus;
  };
  assignee: { id: string; name: string | null; email: string } | null;
};

function defaultFollowUpLocal() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function LeadsMachineDashboard({
  leads,
  todayFollowUps,
  overdueFollowUps,
  teamMembers,
  canManage,
  periodLabel,
}: {
  leads: LeadRow[];
  todayFollowUps: FollowUpRow[];
  overdueFollowUps: FollowUpRow[];
  teamMembers: TeamMember[];
  canManage: boolean;
  periodLabel?: string;
}) {
  const [channelFilter, setChannelFilter] = useState<LeadDashboardSourceFilter>(
    LEAD_SOURCE_PRIORITY_CHANNEL,
  );
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (channelFilter === "ALL") {
      return leads;
    }
    return leads.filter((lead) => lead.channel === channelFilter);
  }, [channelFilter, leads]);

  return (
    <div className="leads-machine">
      <div className="leads-machine-followups">
        <section className="saas-panel">
          <h2>Today&apos;s follow-ups</h2>
          {todayFollowUps.length === 0 ? (
            <p className="leads-machine-muted">No follow-ups scheduled for today.</p>
          ) : (
            <ul className="leads-machine-followup-list">
              {todayFollowUps.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.lead.name || item.lead.phone || "Lead"}</strong>
                    <span>{LEAD_CHANNEL_LABELS[item.lead.channel]}</span>
                  </div>
                  {canManage ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await completeInboundLeadFollowUp(item.id);
                        })
                      }
                    >
                      Done
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="saas-panel">
          <h2>Overdue</h2>
          {overdueFollowUps.length === 0 ? (
            <p className="leads-machine-muted">No overdue follow-ups.</p>
          ) : (
            <ul className="leads-machine-followup-list">
              {overdueFollowUps.map((item) => (
                <li key={item.id} className="is-overdue">
                  <div>
                    <strong>{item.lead.name || item.lead.phone || "Lead"}</strong>
                    <span>{new Date(item.scheduledAt).toLocaleString("en-IN")}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="leads-machine-filters">
        {LEAD_DASHBOARD_SOURCE_FILTERS.map((channel) => {
          const comingSoon = channel !== "ALL" && isLeadSourceComingSoon(channel);
          const isPriority = channel === LEAD_SOURCE_PRIORITY_CHANNEL;
          const label =
            channel === "ALL" ? "All sources" : LEAD_CHANNEL_LABELS[channel];

          return (
            <button
              key={channel}
              type="button"
              disabled={comingSoon}
              className={[
                "leads-machine-filter",
                channelFilter === channel ? "active" : "",
                isPriority ? "is-priority" : "",
                comingSoon ? "is-coming-soon" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                if (!comingSoon) {
                  setChannelFilter(channel);
                }
              }}
            >
              {label}
              {comingSoon ? (
                <span className="leads-coming-soon-badge">Coming soon</span>
              ) : isPriority ? (
                <span className="leads-priority-badge">Active</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="leads-machine-table-wrap">
        <div className="leads-table-head">
          <h2>{periodLabel ? `Leads (${periodLabel})` : "All leads"}</h2>
        </div>
        <table className="leads-machine-table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Captured</th>
              <th>Source</th>
              <th>Status</th>
              <th>FMS (Lead - Sales)</th>
              <th>Owner</th>
              {canManage ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 7 : 6}>
                  <p className="leads-machine-muted">
                    No Google Sheets leads in this period yet. Open Source settings to
                    connect your sheet and run Sync now.
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <strong>{lead.name || "Unnamed lead"}</strong>
                    <span className="leads-machine-sub">
                      {lead.phone || lead.email || "No contact"}
                    </span>
                    {lead.requirement ? (
                      <span className="leads-machine-sub">{lead.requirement}</span>
                    ) : null}
                  </td>
                  <td>
                    {(lead.capturedAt ?? lead.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td>
                    <span className={`leads-channel-badge channel-${lead.channel.toLowerCase()}`}>
                      {LEAD_CHANNEL_LABELS[lead.channel]}
                    </span>
                    {lead.sourceDetail ? (
                      <span className="leads-machine-sub">{lead.sourceDetail}</span>
                    ) : null}
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
                    {lead.fmsInstance ? (
                      <Link
                        className="leads-fms-link"
                        href={fmsInstanceHref(lead.fmsInstance.id, "lines")}
                      >
                        {lead.fmsStep?.activeStep || "In pipeline"} ({lead.fmsStep?.progress})
                      </Link>
                    ) : canManage ? (
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            await bridgeLeadToFmsAction(lead.id);
                          })
                        }
                      >
                        Start FMS job
                      </button>
                    ) : (
                      "Not linked"
                    )}
                  </td>
                  <td>
                    {canManage ? (
                      <select
                        value={lead.assignedTo?.id ?? ""}
                        disabled={pending}
                        onChange={(event) =>
                          startTransition(async () => {
                            await assignInboundLead(
                              lead.id,
                              event.target.value || null,
                            );
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
                  {canManage ? (
                    <td>
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={pending}
                        onClick={() => {
                          const notes = window.prompt("Follow-up notes (optional)") ?? "";
                          startTransition(async () => {
                            await scheduleInboundLeadFollowUp({
                              leadId: lead.id,
                              scheduledAt: defaultFollowUpLocal(),
                              notes,
                            });
                          });
                        }}
                      >
                        Schedule follow-up
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
