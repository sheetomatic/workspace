"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { TaskAssigneeWorkloadRow } from "@/lib/tasks";
import { assigneeInitials } from "@/lib/tasks";

export function TaskAssigneeDashboard({
  rows,
  showTeam,
}: {
  rows: TaskAssigneeWorkloadRow[];
  showTeam: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeAssignee = searchParams.get("assignee") ?? "";

  if (!showTeam || rows.length === 0) {
    return null;
  }

  function hrefFor(userId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (activeAssignee === userId) {
      params.delete("assignee");
    } else {
      params.set("assignee", userId);
    }
    params.delete("page");
    const query = params.toString();
    return query ? `${pathname}?${query}#execution-queue` : `${pathname}#execution-queue`;
  }

  return (
    <section className="ws-sf-related-list ws-task-team-dashboard" aria-label="Assignee workload">
      <header className="ws-sf-related-list-header ws-task-team-head">
        <h2>Team Workload</h2>
        <span>Select a member to filter the list</span>
      </header>
      <div className="ws-sf-related-list-body">
        <div className="ws-task-team-scroll ws-sf-related-list-scroll">
          {rows.map((row) => {
            const active = activeAssignee === row.userId;
            return (
              <Link
                key={row.userId}
                aria-current={active ? "true" : undefined}
                className={`ws-task-team-card ws-sf-related-card${active ? " is-active" : ""}${row.overdue > 0 ? " has-overdue" : ""}`}
                href={hrefFor(row.userId)}
              >
                <span className="ws-task-avatar ws-task-team-avatar">
                  {assigneeInitials(row.name, row.name)}
                </span>
                <span className="ws-task-team-name">{row.name}</span>
                <strong>{row.total}</strong>
                <span className="ws-task-team-label">active tasks</span>
                <div className="ws-task-team-badges">
                  {row.pending > 0 ? (
                    <span className="tone-pending ws-sf-badge ws-sf-badge-neutral">
                      {row.pending} pending
                    </span>
                  ) : null}
                  {row.inProgress > 0 ? (
                    <span className="tone-progress ws-sf-badge ws-sf-badge-info">
                      {row.inProgress} in progress
                    </span>
                  ) : null}
                  {row.overdue > 0 ? (
                    <span className="tone-overdue ws-sf-badge ws-sf-badge-danger">
                      {row.overdue} overdue
                    </span>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
