"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CheckSquare,
  ClipboardList,
  GitBranch,
  ListTodo,
} from "lucide-react";
import type { PcWorkItem } from "@/lib/checklists/pc-work";
import { PcStatusPill, PcWorkKindBadge } from "@/components/saas/pc-work-badges";

type Filter = "ALL" | "CHECKLIST" | "EA_TASK" | "FMS_STEP";

function filterLabel(filter: Filter) {
  if (filter === "ALL") return "All";
  if (filter === "CHECKLIST") return "PC";
  if (filter === "EA_TASK") return "EA";
  return "FMS";
}

export function PcMonitorBoard({
  checklists,
  eaTasks,
  fmsSteps,
  fmsEnabled,
}: {
  checklists: PcWorkItem[];
  eaTasks: PcWorkItem[];
  fmsSteps: PcWorkItem[];
  fmsEnabled: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("ALL");

  const allItems = useMemo(
    () => [...checklists, ...eaTasks, ...(fmsEnabled ? fmsSteps : [])],
    [checklists, eaTasks, fmsSteps, fmsEnabled],
  );

  const filtered = useMemo(() => {
    if (filter === "ALL") return allItems;
    return allItems.filter((item) => item.kind === filter);
  }, [allItems, filter]);

  const filters: Filter[] = fmsEnabled
    ? ["ALL", "CHECKLIST", "EA_TASK", "FMS_STEP"]
    : ["ALL", "CHECKLIST", "EA_TASK"];

  const counts = {
    ALL: allItems.length,
    CHECKLIST: checklists.length,
    EA_TASK: eaTasks.length,
    FMS_STEP: fmsSteps.length,
  };

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
    <div className="ws-pc-metrics ws-sf-metrics">
      <div className={`ws-pc-metric-card${overdueCount > 0 ? " is-alert" : ""}`}>
        <ClipboardList size={18} aria-hidden />
        <div>
          <span>Overdue</span>
          <strong className={overdueCount > 0 ? "is-late" : undefined}>
            {overdueCount}
          </strong>
        </div>
      </div>
      <div className="ws-pc-metric-card">
        <CheckSquare size={18} aria-hidden />
        <div>
          <span>PC checklist</span>
          <strong>{checklistCount}</strong>
        </div>
      </div>
      <div className="ws-pc-metric-card">
        <ListTodo size={18} aria-hidden />
        <div>
          <span>EA tasks</span>
          <strong>{eaCount}</strong>
        </div>
      </div>
      {fmsEnabled ? (
        <div className="ws-pc-metric-card">
          <GitBranch size={18} aria-hidden />
          <div>
            <span>FMS steps</span>
            <strong>{fmsCount}</strong>
          </div>
        </div>
      ) : null}
    </div>
  );
}
