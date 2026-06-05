"use client";

import Link from "next/link";
import { Fragment, useMemo, useState, useTransition } from "react";
import {
  CalendarClock,
  MessageCircle,
  Phone,
  UserRound,
} from "lucide-react";
import type { WaPipelineStage } from "@prisma/client";
import {
  assignWaLead,
  completeWaFollowUp,
  scheduleWaFollowUp,
  updateWaLeadNotes,
  updateWaLeadStage,
} from "@/app/ai/app/contacts/actions";
import { formatWhatsAppPhone } from "@/lib/phone";
import {
  WA_PIPELINE_LABELS,
  followUpUrgency,
  formatFollowUpTime,
  parseContactTags,
} from "@/lib/wa-crm-shared";

type TeamMember = {
  user: { id: string; name: string | null; email: string };
};

type FollowUpRow = {
  id: string;
  scheduledAt: Date;
  notes: string | null;
  reminderNote: string | null;
  contact: {
    id: string;
    name: string | null;
    phone: string;
    pipelineStage: WaPipelineStage;
    conversations: { id: string }[];
  };
  assignee: { id: string; name: string | null; email: string } | null;
};

type LeadRow = {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  city: string | null;
  requirementDescription: string | null;
  pipelineStage: WaPipelineStage;
  notes: string | null;
  tags: unknown;
  leadCaptureComplete: boolean;
  unreadCount: number;
  lastMessageAt: Date | null;
  nextFollowUpAt: Date | null;
  assignedTo: { id: string; name: string | null; email: string } | null;
  followUps: Array<{
    id: string;
    scheduledAt: Date;
    notes: string | null;
    assignee: { id: string; name: string | null; email: string } | null;
  }>;
  conversations: { id: string }[];
};

function defaultFollowUpLocal() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function stageTone(stage: WaPipelineStage) {
  if (stage === "WON") return "won";
  if (stage === "LOST") return "lost";
  if (stage === "DEMO_BOOKED") return "demo";
  if (stage === "QUALIFIED") return "qualified";
  return "new";
}

function memberLabel(member: TeamMember) {
  const name = member.user.name?.trim();
  if (name) {
    return name;
  }
  return member.user.email.split("@")[0] ?? member.user.email;
}

type AssigneeFilter = "all" | "unassigned" | string;

export function WaCrmDashboard({
  stats,
  leads,
  todayFollowUps,
  overdueFollowUps,
  teamMembers,
  currentUserId,
}: {
  stats: {
    totalLeads: number;
    unassigned: number;
    openPipeline: number;
    todayFollowUps: number;
    overdueFollowUps: number;
    myTodayFollowUps: number;
    hotLeads: number;
    dueThisWeek: number;
  };
  leads: LeadRow[];
  todayFollowUps: FollowUpRow[];
  overdueFollowUps: FollowUpRow[];
  teamMembers: TeamMember[];
  currentUserId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"all" | "mine" | "unassigned" | "hot">(
    "all",
  );
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>("all");
  const [stageFilter, setStageFilter] = useState<WaPipelineStage | "ALL">("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [scheduleFor, setScheduleFor] = useState<string | null>(null);
  const [scheduleAt, setScheduleAt] = useState(defaultFollowUpLocal());
  const [scheduleNotes, setScheduleNotes] = useState("");
  const [scheduleReminder, setScheduleReminder] = useState("");

  const teamWorkload = useMemo(() => {
    const memberRows = teamMembers.map((member) => {
      const id = member.user.id;
      const assignedLeads = leads.filter(
        (lead) =>
          lead.assignedTo?.id === id && lead.pipelineStage !== "LOST",
      ).length;
      const todayCount = todayFollowUps.filter(
        (item) => item.assignee?.id === id,
      ).length;
      const overdueCount = overdueFollowUps.filter(
        (item) => item.assignee?.id === id,
      ).length;

      return {
        id,
        label: memberLabel(member),
        assignedLeads,
        todayCount,
        overdueCount,
        isMe: id === currentUserId,
      };
    });

    const unassignedLeads = leads.filter(
      (lead) => !lead.assignedTo && lead.pipelineStage !== "LOST",
    ).length;

    return { memberRows, unassignedLeads };
  }, [leads, teamMembers, todayFollowUps, overdueFollowUps, currentUserId]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (stageFilter !== "ALL" && lead.pipelineStage !== stageFilter) {
        return false;
      }
      if (assigneeFilter === "unassigned" && lead.assignedTo) {
        return false;
      }
      if (
        assigneeFilter !== "all" &&
        assigneeFilter !== "unassigned" &&
        lead.assignedTo?.id !== assigneeFilter
      ) {
        return false;
      }
      if (filter === "mine" && lead.assignedTo?.id !== currentUserId) {
        return false;
      }
      if (filter === "unassigned" && lead.assignedTo) {
        return false;
      }
      if (
        filter === "hot" &&
        !(lead.unreadCount > 0 || lead.pipelineStage === "NEW")
      ) {
        return false;
      }
      return true;
    });
  }, [leads, filter, stageFilter, assigneeFilter, currentUserId]);

  function setQuickFilter(next: typeof filter) {
    setFilter(next);
    if (next === "mine") {
      setAssigneeFilter(currentUserId);
      return;
    }
    if (next === "unassigned") {
      setAssigneeFilter("unassigned");
      return;
    }
    if (next === "all") {
      setAssigneeFilter("all");
    }
  }

  function setTeamAssigneeFilter(next: AssigneeFilter) {
    setAssigneeFilter(next);
    if (next === "all") {
      setFilter("all");
      return;
    }
    if (next === "unassigned") {
      setFilter("unassigned");
      return;
    }
    if (next === currentUserId) {
      setFilter("mine");
      return;
    }
    setFilter("all");
  }

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action();
      setFeedback(result.message);
    });
  }

  const metricCards = [
    { label: "Total leads", value: stats.totalLeads, tone: "default" },
    { label: "Today's follow-ups", value: stats.todayFollowUps, tone: "today" },
    { label: "Overdue", value: stats.overdueFollowUps, tone: "danger" },
    { label: "Unassigned", value: stats.unassigned, tone: "warn" },
    { label: "Open pipeline", value: stats.openPipeline, tone: "default" },
    { label: "My follow-ups today", value: stats.myTodayFollowUps, tone: "today" },
  ];

  return (
    <div className={`wa-crm-dashboard${pending ? " is-loading" : ""}`}>
      <div className="wa-crm-metrics">
        {metricCards.map((card) => (
          <article className={`wa-crm-metric tone-${card.tone}`} key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </div>

      <section className="wa-crm-team">
        <header className="wa-crm-team-head">
          <h2>Team workload</h2>
          <span>Filter leads by assignee</span>
        </header>
        <div className="wa-crm-team-scroll">
          <button
            className={`wa-crm-team-card${assigneeFilter === "all" ? " is-active" : ""}`}
            type="button"
            onClick={() => setTeamAssigneeFilter("all")}
          >
            <span className="wa-crm-team-name">All team</span>
            <strong>{stats.totalLeads}</strong>
            <em>Total leads</em>
          </button>
          <button
            className={`wa-crm-team-card${assigneeFilter === "unassigned" ? " is-active" : ""}`}
            type="button"
            onClick={() => setTeamAssigneeFilter("unassigned")}
          >
            <span className="wa-crm-team-name">Unassigned</span>
            <strong>{teamWorkload.unassignedLeads}</strong>
            <em>Needs owner</em>
          </button>
          {teamWorkload.memberRows.map((member) => (
            <button
              key={member.id}
              className={`wa-crm-team-card${assigneeFilter === member.id ? " is-active" : ""}${member.isMe ? " is-me" : ""}`}
              type="button"
              onClick={() => setTeamAssigneeFilter(member.id)}
            >
              <span className="wa-crm-team-name">
                {member.label}
                {member.isMe ? " (You)" : ""}
              </span>
              <strong>{member.assignedLeads}</strong>
              <em>Assigned leads</em>
              <div className="wa-crm-team-badges">
                {member.todayCount > 0 ? (
                  <span className="wa-crm-team-badge tone-today">
                    {member.todayCount} today
                  </span>
                ) : null}
                {member.overdueCount > 0 ? (
                  <span className="wa-crm-team-badge tone-overdue">
                    {member.overdueCount} overdue
                  </span>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="wa-crm-layout">
        <section className="wa-crm-main">
          <header className="wa-crm-toolbar">
            <div className="wa-crm-filters">
              {(
                [
                  ["all", "All leads"],
                  ["mine", "My leads"],
                  ["unassigned", "Unassigned"],
                  ["hot", "Hot"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  className={filter === key ? "is-active" : ""}
                  type="button"
                  onClick={() => setQuickFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="wa-crm-stage-filter">
              Stage
              <select
                value={stageFilter}
                onChange={(e) =>
                  setStageFilter(e.target.value as WaPipelineStage | "ALL")
                }
              >
                <option value="ALL">All stages</option>
                {(Object.keys(WA_PIPELINE_LABELS) as WaPipelineStage[]).map(
                  (stage) => (
                    <option key={stage} value={stage}>
                      {WA_PIPELINE_LABELS[stage]}
                    </option>
                  ),
                )}
              </select>
            </label>
          </header>

          {filteredLeads.length === 0 ? (
            <p className="wa-crm-empty">No leads match this filter.</p>
          ) : (
            <div className="wa-crm-table-scroll">
              <table className="wa-crm-table">
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Stage</th>
                    <th>Assignee</th>
                    <th>Next follow-up</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => {
                    const tags = parseContactTags(lead.tags);
                    const nextFu = lead.followUps[0];
                    const expanded = expandedId === lead.id;
                    const chatId = lead.conversations[0]?.id;
                    return (
                      <Fragment key={lead.id}>
                        <tr
                          className={
                            lead.unreadCount > 0 ? "row-hot" : undefined
                          }
                        >
                          <td>
                            <button
                              className="wa-crm-lead-name"
                              type="button"
                              onClick={() =>
                                setExpandedId(expanded ? null : lead.id)
                              }
                            >
                              <strong>
                                {lead.name ?? formatWhatsAppPhone(lead.phone)}
                              </strong>
                            </button>
                            <span className="wa-crm-lead-meta">
                              <Phone aria-hidden size={12} />
                              {formatWhatsAppPhone(lead.phone)}
                            </span>
                            {lead.city ? (
                              <span className="wa-crm-lead-meta">{lead.city}</span>
                            ) : null}
                            {tags.length > 0 ? (
                              <span className="wa-crm-tags">{tags.join(" · ")}</span>
                            ) : null}
                          </td>
                          <td>
                            <select
                              className={`wa-crm-stage-select tone-${stageTone(lead.pipelineStage)}`}
                              value={lead.pipelineStage}
                              onChange={(e) =>
                                run(() =>
                                  updateWaLeadStage(
                                    lead.id,
                                    e.target.value as WaPipelineStage,
                                  ),
                                )
                              }
                            >
                              {(Object.keys(WA_PIPELINE_LABELS) as WaPipelineStage[]).map(
                                (stage) => (
                                  <option key={stage} value={stage}>
                                    {WA_PIPELINE_LABELS[stage]}
                                  </option>
                                ),
                              )}
                            </select>
                          </td>
                          <td>
                            <select
                              className="wa-crm-assign-select"
                              value={lead.assignedTo?.id ?? ""}
                              onChange={(e) =>
                                run(() =>
                                  assignWaLead(
                                    lead.id,
                                    e.target.value || null,
                                  ),
                                )
                              }
                            >
                              <option value="">Unassigned</option>
                              {teamMembers.map((member) => (
                                <option key={member.user.id} value={member.user.id}>
                                  {member.user.name ?? member.user.email}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            {nextFu ? (
                              <span
                                className={`wa-crm-fu-pill tone-${followUpUrgency(nextFu.scheduledAt)}`}
                              >
                                {formatFollowUpTime(nextFu.scheduledAt)}
                              </span>
                            ) : (
                              <span className="wa-crm-muted">—</span>
                            )}
                          </td>
                          <td className="wa-crm-actions">
                            <button
                              type="button"
                              onClick={() => {
                                setScheduleFor(lead.id);
                                setScheduleAt(defaultFollowUpLocal());
                                setScheduleNotes("");
                                setScheduleReminder("");
                              }}
                            >
                              <CalendarClock size={14} />
                              Follow-up
                            </button>
                            {chatId ? (
                              <Link
                                className="wa-crm-btn-wa"
                                href={`/ai/app/inbox?c=${chatId}`}
                              >
                                <MessageCircle size={14} />
                                Chat
                              </Link>
                            ) : null}
                          </td>
                        </tr>
                        {expanded ? (
                          <tr className="wa-crm-detail-row" key={`${lead.id}-detail`}>
                            <td colSpan={5}>
                              <div className="wa-crm-detail">
                                <p>
                                  <strong>Requirement:</strong>{" "}
                                  {lead.requirementDescription ?? "—"}
                                </p>
                                <p>
                                  <strong>Email:</strong> {lead.email ?? "—"}
                                </p>
                                <label>
                                  Notes
                                  <textarea
                                    defaultValue={lead.notes ?? ""}
                                    rows={2}
                                    onBlur={(e) =>
                                      run(() =>
                                        updateWaLeadNotes(lead.id, e.target.value),
                                      )
                                    }
                                  />
                                </label>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                        {scheduleFor === lead.id ? (
                          <tr className="wa-crm-schedule-row" key={`${lead.id}-schedule`}>
                            <td colSpan={5}>
                              <form
                                className="wa-crm-schedule-form"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  run(async () => {
                                    const result = await scheduleWaFollowUp({
                                      contactId: lead.id,
                                      scheduledAt: scheduleAt,
                                      notes: scheduleNotes,
                                      reminderNote: scheduleReminder,
                                    });
                                    if (result.ok) {
                                      setScheduleFor(null);
                                    }
                                    return result;
                                  });
                                }}
                              >
                                <label>
                                  Next date
                                  <input
                                    required
                                    type="datetime-local"
                                    value={scheduleAt}
                                    onChange={(e) => setScheduleAt(e.target.value)}
                                  />
                                </label>
                                <label>
                                  Follow-up notes
                                  <input
                                    placeholder="Call back, send quote..."
                                    value={scheduleNotes}
                                    onChange={(e) => setScheduleNotes(e.target.value)}
                                  />
                                </label>
                                <label>
                                  Pre-sale reminder
                                  <input
                                    placeholder="Remind: pricing discussion"
                                    value={scheduleReminder}
                                    onChange={(e) =>
                                      setScheduleReminder(e.target.value)
                                    }
                                  />
                                </label>
                                <button className="wa-crm-btn-save" type="submit">
                                  Save follow-up
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setScheduleFor(null)}
                                >
                                  Cancel
                                </button>
                              </form>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="wa-crm-side">
          <FollowUpPanel
            title="Today's follow-ups"
            empty="Nothing scheduled for today."
            items={todayFollowUps}
            onComplete={(id) => run(() => completeWaFollowUp(id))}
          />
          <FollowUpPanel
            title="Overdue"
            empty="No overdue follow-ups."
            items={overdueFollowUps}
            onComplete={(id) => run(() => completeWaFollowUp(id))}
            tone="danger"
          />
        </aside>
      </div>

      {feedback ? (
        <p className="wa-crm-feedback" role="status">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}

function FollowUpPanel({
  title,
  empty,
  items,
  onComplete,
  tone,
}: {
  title: string;
  empty: string;
  items: FollowUpRow[];
  onComplete: (id: string) => void;
  tone?: "danger";
}) {
  return (
    <article className={`wa-crm-fu-panel${tone ? ` tone-${tone}` : ""}`}>
      <header>
        <h3>{title}</h3>
        <span>{items.length}</span>
      </header>
      {items.length === 0 ? (
        <p className="wa-crm-muted">{empty}</p>
      ) : (
        <ul>
          {items.map((item) => {
            const chatId = item.contact.conversations[0]?.id;
            return (
              <li key={item.id}>
                <div className="wa-crm-fu-item-head">
                  <strong>
                    {item.contact.name ??
                      formatWhatsAppPhone(item.contact.phone)}
                  </strong>
                  <span>{formatFollowUpTime(item.scheduledAt)}</span>
                </div>
                {item.assignee ? (
                  <span className="wa-crm-fu-assignee">
                    <UserRound size={12} />
                    {item.assignee.name ?? item.assignee.email}
                  </span>
                ) : null}
                {item.notes ? <p>{item.notes}</p> : null}
                {item.reminderNote ? (
                  <p className="wa-crm-fu-reminder">{item.reminderNote}</p>
                ) : null}
                <div className="wa-crm-fu-actions">
                  <button type="button" onClick={() => onComplete(item.id)}>
                    Done
                  </button>
                  {chatId ? (
                    <Link
                      className="wa-crm-btn-wa"
                      href={`/ai/app/inbox?c=${chatId}`}
                    >
                      Open chat
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
