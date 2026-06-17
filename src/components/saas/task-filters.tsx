"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import type { TaskStatus } from "@prisma/client";

const statuses: Array<{ value: TaskStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "AWAITING_VERIFICATION", label: "Awaiting verification" },
  { value: "REVISION_REQUESTED", label: "Revision" },
  { value: "EXTENSION_REQUESTED", label: "Extension" },
  { value: "HELP_REQUESTED", label: "Help" },
  { value: "COMPLETED", label: "Completed" },
];

export function TaskFilters({
  members,
  current,
  showAssigneeFilter = true,
  inListHeader = false,
}: {
  members: Array<{ id: string; name: string }>;
  current: {
    status?: string;
    assignee?: string;
    overdue?: string;
    doneToday?: string;
  };
  showAssigneeFilter?: boolean;
  inListHeader?: boolean;
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
  const doneTodayOnly = current.doneToday === "1";

  const pushFilters = useCallback(
    (next: {
      status?: string;
      assignee?: string;
      overdue?: string;
      clearQuick?: boolean;
    }) => {
      const params = new URLSearchParams(searchParams.toString());

      if (next.clearQuick) {
        params.delete("doneToday");
        params.delete("overdue");
      }

      if (next.status === undefined) {
        /* keep */
      } else if (!next.status || next.status === "ALL") {
        params.delete("status");
      } else {
        params.set("status", next.status);
        params.delete("doneToday");
        params.delete("overdue");
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
        router.push(
          query ? `${pathname}?${query}#execution-queue` : `${pathname}#execution-queue`,
          { scroll: false },
        );
        window.requestAnimationFrame(() => {
          document.getElementById("execution-queue")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      });
    },
    [pathname, router, searchParams],
  );

  const hasActiveFilters =
    activeStatus !== "ALL" ||
    (showAssigneeFilter && Boolean(activeAssignee)) ||
    overdueOnly ||
    doneTodayOnly;

  function clearAll() {
    startTransition(() => {
      router.push(pathname);
    });
  }

  return (
    <div
      className={`ws-task-filter-bar ws-task-filter-bar-compact${inListHeader ? " ws-sf-list-filters" : ""}${pending ? " is-loading" : ""}`}
    >
      <div className={`ws-filter-layout ws-filter-layout-compact${inListHeader ? " ws-sf-filter-layout" : ""}`}>
        <div className="ws-filter-group">
          <span className="ws-filter-group-label">Status</span>
          <div className="ws-filter-select-wrap">
            <select
              aria-label="Filter by status"
              className="ws-filter-select"
              value={activeStatus}
              onChange={(event) =>
                pushFilters({ status: event.target.value, clearQuick: true })
              }
            >
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="ws-filter-select-icon" size={16} />
          </div>
        </div>

        {showAssigneeFilter ? (
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
        ) : null}

        {overdueOnly ? (
          <span className="ws-filter-active-chip">Overdue filter on</span>
        ) : null}

        {hasActiveFilters ? (
          <button className="ws-filter-clear ws-filter-clear-inline" type="button" onClick={clearAll}>
            Clear
          </button>
        ) : null}
      </div>

      {doneTodayOnly ? (
        <p className="ws-filter-done-today-hint">
          Showing tasks completed today.{" "}
          <button
            className="ws-filter-clear ws-filter-clear-inline"
            type="button"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete("doneToday");
              startTransition(() => {
                router.push(
                  params.toString() ? `${pathname}?${params.toString()}` : pathname,
                );
              });
            }}
          >
            Clear
          </button>
        </p>
      ) : null}
    </div>
  );
}
