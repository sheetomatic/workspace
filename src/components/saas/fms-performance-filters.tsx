"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { ChevronDown } from "lucide-react";

const dueOptions = [
  { value: "all", label: "All due dates" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due today" },
  { value: "this_week", label: "Due this week" },
  { value: "no_due", label: "No due date" },
] as const;

export function FmsPerformanceFilters({
  workflows,
  doers,
  current,
}: {
  workflows: { id: string; name: string }[];
  doers: { id: string; name: string }[];
  current: {
    fms?: string;
    doer?: string;
    due?: string;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const activeFms = current.fms ?? "all";
  const activeDoer = current.doer ?? "all";
  const activeDue = current.due ?? "all";

  const pushFilters = useCallback(
    (next: { fms?: string; doer?: string; due?: string }) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(next)) {
        if (!value || value === "all") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      const query = params.toString();
      startTransition(() => {
        router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const hasActiveFilters =
    activeFms !== "all" || activeDoer !== "all" || activeDue !== "all";

  function clearAll() {
    startTransition(() => {
      router.push(pathname);
    });
  }

  return (
    <div
      className={`ws-task-filter-bar ws-fms-perf-filter-bar${pending ? " is-loading" : ""}`}
    >
      <div className="ws-fms-perf-filter-layout">
        <div className="ws-filter-group">
          <span className="ws-filter-group-label">FMS wise</span>
          <div className="ws-filter-select-wrap">
            <select
              aria-label="Filter by workflow"
              className="ws-filter-select"
              value={activeFms}
              onChange={(event) => pushFilters({ fms: event.target.value })}
            >
              <option value="all">All workflows</option>
              {workflows.map((workflow) => (
                <option key={workflow.id} value={workflow.id}>
                  {workflow.name}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="ws-filter-select-icon" size={16} />
          </div>
        </div>

        <div className="ws-filter-group">
          <span className="ws-filter-group-label">Doer wise</span>
          <div className="ws-filter-select-wrap">
            <select
              aria-label="Filter by doer"
              className="ws-filter-select"
              value={activeDoer}
              onChange={(event) => pushFilters({ doer: event.target.value })}
            >
              <option value="all">All doers</option>
              {doers.map((doer) => (
                <option key={doer.id} value={doer.id}>
                  {doer.name}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="ws-filter-select-icon" size={16} />
          </div>
        </div>

        <div className="ws-filter-group">
          <span className="ws-filter-group-label">Due date wise</span>
          <div className="ws-filter-select-wrap">
            <select
              aria-label="Filter by due date"
              className="ws-filter-select"
              value={activeDue}
              onChange={(event) => pushFilters({ due: event.target.value })}
            >
              {dueOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="ws-filter-select-icon" size={16} />
          </div>
        </div>

        {hasActiveFilters ? (
          <button
            className="ws-filter-clear ws-filter-clear-inline"
            type="button"
            onClick={clearAll}
          >
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
}
