"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PcWorkItem } from "@/lib/checklists/pc-work";
import { PcStatusPill, PcWorkKindBadge } from "@/components/saas/pc-work-badges";

type Filter = "ALL" | "CHECKLIST" | "EA_TASK" | "FMS_STEP";

type MemberOption = {
  id: string;
  name: string | null;
  email: string;
};

function filterLabel(filter: Filter) {
  if (filter === "ALL") return "All";
  if (filter === "CHECKLIST") return "PC";
  if (filter === "EA_TASK") return "EA";
  return "FMS";
}

function memberLabel(member: MemberOption) {
  return member.name ?? member.email.split("@")[0];
}

function resolveMemberLabel(members: MemberOption[], id: string | null) {
  if (!id) {
    return "Unassigned";
  }
  const member = members.find((row) => row.id === id);
  return member ? memberLabel(member) : id.slice(0, 8);
}

export function PcMonitorBoard({
  checklists,
  eaTasks,
  fmsSteps,
  fmsEnabled,
  members,
}: {
  checklists: PcWorkItem[];
  eaTasks: PcWorkItem[];
  fmsSteps: PcWorkItem[];
  fmsEnabled: boolean;
  members: MemberOption[];
}) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [doerId, setDoerId] = useState("");
  const [pcFilterIds, setPcFilterIds] = useState<string[]>([]);
  const [eaFilterId, setEaFilterId] = useState("");

  const allItems = useMemo(
    () => [...checklists, ...eaTasks, ...(fmsEnabled ? fmsSteps : [])],
    [checklists, eaTasks, fmsSteps, fmsEnabled],
  );

  const doerOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const item of allItems) {
      if (item.ownerId) {
        ids.add(item.ownerId);
      }
    }
    return [...ids]
      .map((id) => {
        const member = members.find((row) => row.id === id);
        const item = allItems.find((row) => row.ownerId === id);
        return {
          id,
          label: member ? memberLabel(member) : (item?.owner ?? id.slice(0, 8)),
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allItems, members]);

  const pcOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const item of allItems) {
      for (const id of item.pcUserIds) {
        ids.add(id);
      }
    }
    return [...ids]
      .map((id) => ({
        id,
        label: resolveMemberLabel(members, id),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allItems, members]);

  const eaOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const item of allItems) {
      if (item.eaUserId) {
        ids.add(item.eaUserId);
      }
    }
    return [...ids]
      .map((id) => ({
        id,
        label: resolveMemberLabel(members, id),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allItems, members]);

  const filtered = useMemo(() => {
    let items = allItems;
    if (filter !== "ALL") {
      items = items.filter((item) => item.kind === filter);
    }
    if (doerId) {
      items = items.filter((item) => item.ownerId === doerId);
    }
    if (pcFilterIds.length > 0) {
      items = items.filter((item) =>
        item.pcUserIds.some((id) => pcFilterIds.includes(id)),
      );
    }
    if (eaFilterId) {
      items = items.filter((item) => item.eaUserId === eaFilterId);
    }
    return items;
  }, [allItems, filter, doerId, pcFilterIds, eaFilterId]);

  const filters: Filter[] = fmsEnabled
    ? ["ALL", "CHECKLIST", "EA_TASK", "FMS_STEP"]
    : ["ALL", "CHECKLIST", "EA_TASK"];

  const counts = {
    ALL: allItems.length,
    CHECKLIST: checklists.length,
    EA_TASK: eaTasks.length,
    FMS_STEP: fmsSteps.length,
  };

  function togglePcFilter(id: string) {
    setPcFilterIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
  }

  return (
    <section className="ws-sf-list-view ws-pc-monitor-queue">
      <header className="ws-sf-list-view-header ws-pc-queue-header">
        <div className="ws-pc-queue-header-row">
          <div className="ws-sf-list-view-title">
            <h2>Completion queue</h2>
            <span className="ws-sf-list-view-count">{allItems.length}</span>
          </div>
          <div className="ws-pc-filter-tabs" role="tablist" aria-label="Queue filter">
            {filters.map((tab) => (
              <button
                key={tab}
                className={`ws-pc-filter-tab${filter === tab ? " is-active" : ""}`}
                type="button"
                role="tab"
                aria-selected={filter === tab}
                onClick={() => setFilter(tab)}
              >
                {filterLabel(tab)}
                <em>{counts[tab]}</em>
              </button>
            ))}
          </div>
        </div>
        <div className="ws-pc-monitor-filters">
          <label className="ws-pc-monitor-filter">
            <span>Doer</span>
            <select value={doerId} onChange={(event) => setDoerId(event.target.value)}>
              <option value="">All doers</option>
              {doerOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {pcOptions.length > 0 ? (
            <div className="ws-pc-monitor-filter ws-pc-monitor-filter-multi">
              <span>PC</span>
              <div className="ws-pc-monitor-filter-chips">
                {pcOptions.map((option) => {
                  const active = pcFilterIds.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`ws-pc-filter-chip${active ? " is-active" : ""}`}
                      aria-pressed={active}
                      onClick={() => togglePcFilter(option.id)}
                    >
                      {option.label}
                    </button>
                  );
                })}
                {pcFilterIds.length > 0 ? (
                  <button
                    type="button"
                    className="ws-pc-filter-chip is-clear"
                    onClick={() => setPcFilterIds([])}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          {eaOptions.length > 0 ? (
            <label className="ws-pc-monitor-filter">
              <span>EA</span>
              <select
                value={eaFilterId}
                onChange={(event) => setEaFilterId(event.target.value)}
              >
                <option value="">All EA</option>
                {eaOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        <p className="ws-pc-queue-lead">
          PC reminds doers until done. Assign one-off work in EA (Tasks).
        </p>
      </header>

      {filtered.length === 0 ? (
        <div className="ws-empty-state ws-fms-empty-state is-positive ws-pc-queue-empty">
          <p>No pending {filter === "ALL" ? "work" : filterLabel(filter)} items.</p>
        </div>
      ) : (
        <div className="ws-sf-table-wrap ws-pc-queue-table-wrap">
          <table className="ws-fms-data-table ws-sf-data-table ws-pc-queue-table">
            <thead>
              <tr>
                <th className="ws-pc-col-type">Type</th>
                <th className="ws-pc-col-item">Work item</th>
                <th className="ws-pc-col-doer">Doer</th>
                <th className="ws-pc-col-due">Due</th>
                <th className="ws-pc-col-status">Status</th>
                <th className="ws-pc-col-action" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={`${item.kind}-${item.id}`}
                  className={item.overdue ? "is-overdue" : undefined}
                >
                  <td className="ws-pc-col-type">
                    <PcWorkKindBadge kind={item.kind} />
                  </td>
                  <td className="ws-pc-col-item">
                    <div className="ws-pc-work-item-cell">
                      <span className="ws-pc-work-item-title">{item.title}</span>
                      {item.subtitle ? (
                        <span className="ws-pc-work-item-meta">{item.subtitle}</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="ws-pc-col-doer">{item.owner}</td>
                  <td className="ws-pc-col-due ws-pc-due-cell">{item.dueLabel}</td>
                  <td className="ws-pc-col-status">
                    <PcStatusPill status={item.status} overdue={item.overdue} />
                  </td>
                  <td className="ws-pc-col-action">
                    <Link href={item.href} className="ws-pc-open-btn">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function PcMonitorMetrics({
  overdueCount,
  checklistCount,
  eaCount,
  fmsCount,
  fmsEnabled,
}: {
  overdueCount: number;
  checklistCount: number;
  eaCount: number;
  fmsCount: number;
  fmsEnabled: boolean;
}) {
  return (
    <div className="ws-sf-metrics ws-pc-metrics">
      <div className={`ws-sf-metric-tile${overdueCount > 0 ? " is-active" : ""}`}>
        <span>Overdue</span>
        <strong className={overdueCount > 0 ? "is-late" : undefined}>{overdueCount}</strong>
        <span className="ws-stat-card-hint">Chase first</span>
      </div>
      <div className="ws-sf-metric-tile">
        <span>PC checklist</span>
        <strong>{checklistCount}</strong>
        <span className="ws-stat-card-hint">Open in queue</span>
      </div>
      <div className="ws-sf-metric-tile">
        <span>EA tasks</span>
        <strong>{eaCount}</strong>
        <span className="ws-stat-card-hint">Delegated work</span>
      </div>
      {fmsEnabled ? (
        <div className="ws-sf-metric-tile">
          <span>FMS steps</span>
          <strong>{fmsCount}</strong>
          <span className="ws-stat-card-hint">Pipeline stops</span>
        </div>
      ) : null}
    </div>
  );
}
