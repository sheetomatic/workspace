"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { CHECKLIST_TEAM_LABELS } from "@/lib/checklists/constants";
import { CHECKLIST_DEPARTMENT_HREFS } from "@/lib/checklists/pc-rows";

const DUE_CHIPS = [
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "overdue", label: "Overdue" },
] as const;

const DEPARTMENT_OPTIONS = Object.keys(CHECKLIST_TEAM_LABELS);

export function ChecklistPcFilters({
  doers,
  current,
}: {
  doers: { id: string; name: string }[];
  current: {
    due?: string;
    date?: string;
    doer?: string;
    department?: string;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const activeDue = current.due ?? "";
  const activeDate = current.date ?? "";
  const activeDoer = current.doer ?? "all";
  const activeDepartment = current.department ?? "all";

  const pushFilters = useCallback(
    (next: { due?: string; date?: string; doer?: string; department?: string }) => {
      const params = new URLSearchParams(searchParams.toString());

      if ("due" in next) {
        if (!next.due || next.due === "all") {
          params.delete("due");
        } else {
          params.set("due", next.due);
        }
        if (next.due && next.due !== "all") {
          params.delete("date");
        }
      }
      if ("date" in next) {
        if (!next.date) {
          params.delete("date");
        } else {
          params.set("date", next.date);
          params.delete("due");
        }
      }
      if ("doer" in next) {
        if (!next.doer || next.doer === "all") {
          params.delete("doer");
        } else {
          params.set("doer", next.doer);
        }
      }

      let nextPath = pathname;
      if ("department" in next) {
        const team = next.department ?? "all";
        params.delete("tab");
        if (!team || team === "all") {
          params.set("dept", "all");
        } else if (CHECKLIST_DEPARTMENT_HREFS[team] && CHECKLIST_DEPARTMENT_HREFS[team] !== pathname) {
          params.delete("dept");
          nextPath = CHECKLIST_DEPARTMENT_HREFS[team];
        } else if (CHECKLIST_DEPARTMENT_HREFS[team]) {
          params.delete("dept");
        } else {
          params.set("dept", team);
        }
      }

      const query = params.toString();
      startTransition(() => {
        router.push(query ? `${nextPath}?${query}` : nextPath, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const hasActiveFilters = Boolean(
    activeDue || activeDate || (activeDoer && activeDoer !== "all"),
  );

  return (
    <div className={`ws-task-filter-bar ws-pc-filter-bar${pending ? " is-loading" : ""}`}>
      <div className="ws-pc-filter-layout">
        <div className="ws-filter-group">
          <span className="ws-filter-group-label">Due date</span>
          <input
            aria-label="Filter by due date"
            className="ws-filter-select ws-pc-filter-date"
            type="date"
            value={activeDate}
            onChange={(event) => pushFilters({ date: event.target.value })}
          />
        </div>

        <div className="ws-filter-group ws-pc-filter-chips-group">
          <span className="ws-filter-group-label">Period</span>
          <div className="ws-pc-filter-chips" role="group" aria-label="Due period">
            {DUE_CHIPS.map((chip) => {
              const active = !activeDate && activeDue === chip.value;
              return (
                <button
                  key={chip.value}
                  type="button"
                  className={`ws-pc-filter-chip${active ? " is-active" : ""}`}
                  aria-pressed={active}
                  onClick={() =>
                    pushFilters({ due: active ? "all" : chip.value, date: "" })
                  }
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="ws-filter-group">
          <span className="ws-filter-group-label">Doer</span>
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
          <span className="ws-filter-group-label">Department</span>
          <div className="ws-filter-select-wrap">
            <select
              aria-label="Filter by department"
              className="ws-filter-select"
              value={activeDepartment}
              onChange={(event) => pushFilters({ department: event.target.value })}
            >
              <option value="all">All departments</option>
              {DEPARTMENT_OPTIONS.map((team) => (
                <option key={team} value={team}>
                  {CHECKLIST_TEAM_LABELS[team]}
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
            onClick={() => {
              startTransition(() => {
                const params = new URLSearchParams(searchParams.toString());
                params.delete("due");
                params.delete("date");
                params.delete("doer");
                const query = params.toString();
                router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
              });
            }}
          >
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
}
