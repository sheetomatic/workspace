"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { ChevronDown, X } from "lucide-react";
import type { TaskStatus } from "@prisma/client";

const statuses: Array<{ value: TaskStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
];

export function TaskFilters({
  members,
  current,
}: {
  members: Array<{ id: string; name: string }>;
  current: {
    status?: string;
    assignee?: string;
    overdue?: string;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const activeStatus = current.status && current.status !== "ALL"
    ? current.status
    : "ALL";
  const activeAssignee = current.assignee ?? "";
  const overdueOnly = current.overdue === "1";

  const pushFilters = useCallback(
    (next: { status?: string; assignee?: string; overdue?: string }) => {
      const params = new URLSearchParams(searchParams.toString());

      if (next.status === undefined) {
        /* keep */
      } else if (!next.status || next.status === "ALL") {
        params.delete("status");
      } else {
        params.set("status", next.status);
      }

      if (next.assignee === undefined) {
        /* keep */
      } else if (!next.assignee) {
        params.delete("assignee");
      } else {
        params.set("assignee", next.assignee);
      }

      if (next.overdue === undefined) {
        /* keep */
      } else if (next.overdue === "1") {
        params.set("overdue", "1");
      } else {
        params.delete("overdue");
      }

      const query = params.toString();
      startTransition(() => {
        router.push(query ? `${pathname}?${query}` : pathname);
      });
    },
    [pathname, router, searchParams],
  );

  const hasActiveFilters =
    activeStatus !== "ALL" || Boolean(activeAssignee) || overdueOnly;

  const assigneeName = members.find((member) => member.id === activeAssignee)?.name;

  function clearAll() {
    startTransition(() => {
      router.push(pathname);
    });
  }

  return (
    <div className={`ws-task-filter-bar${pending ? " is-loading" : ""}`}>
      <div className="ws-filter-row">
        <div className="ws-filter-group">
          <span className="ws-filter-group-label">Status</span>
          <div className="ws-filter-pills" role="tablist" aria-label="Filter by status">
            {statuses.map((status) => (
              <button
                aria-selected={activeStatus === status.value}
                className={`ws-filter-pill${activeStatus === status.value ? " is-active" : ""}`}
                key={status.value}
                role="tab"
                type="button"
                onClick={() => pushFilters({ status: status.value })}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ws-filter-group ws-filter-group-assignee">
          <span className="ws-filter-group-label">Assignee</span>
          <div className="ws-filter-select-wrap">
            <select
              aria-label="Filter by assignee"
              className="ws-filter-select"
              value={activeAssignee}
              onChange={(event) =>
                pushFilters({ assignee: event.target.value })
              }
            >
              <option value="">Everyone</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="ws-filter-select-icon" size={16} />
          </div>
        </div>

        <button
          aria-pressed={overdueOnly}
          className={`ws-filter-pill ws-filter-overdue${overdueOnly ? " is-active" : ""}`}
          type="button"
          onClick={() => pushFilters({ overdue: overdueOnly ? "" : "1" })}
        >
          Overdue
        </button>
      </div>

      {hasActiveFilters ? (
        <div className="ws-filter-active">
          <span className="ws-filter-active-label">Active filters</span>
          <div className="ws-filter-active-chips">
            {activeStatus !== "ALL" ? (
              <button
                className="ws-filter-chip"
                type="button"
                onClick={() => pushFilters({ status: "ALL" })}
              >
                {statuses.find((status) => status.value === activeStatus)?.label}
                <X aria-hidden size={12} />
              </button>
            ) : null}
            {assigneeName ? (
              <button
                className="ws-filter-chip"
                type="button"
                onClick={() => pushFilters({ assignee: "" })}
              >
                {assigneeName}
                <X aria-hidden size={12} />
              </button>
            ) : null}
            {overdueOnly ? (
              <button
                className="ws-filter-chip"
                type="button"
                onClick={() => pushFilters({ overdue: "" })}
              >
                Overdue
                <X aria-hidden size={12} />
              </button>
            ) : null}
          </div>
          <button className="ws-filter-clear" type="button" onClick={clearAll}>
            Clear all
          </button>
        </div>
      ) : null}
    </div>
  );
}
