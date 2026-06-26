"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useTransition } from "react";
import { CalendarRange, ChevronDown } from "lucide-react";
import {
  currentWeekRange,
  dateToIsoWeek,
  type EmPeriodRange,
  type EmPeriodType,
  toIsoDate,
} from "@/lib/em/em-period";

const periodOptions: { value: EmPeriodType; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "From date - To date" },
];

function defaultMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function EmPeriodFilter({ current }: { current: EmPeriodRange }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const weekValue = current.week ?? dateToIsoWeek(new Date());
  const monthValue = current.month ?? defaultMonthValue();
  const yearValue = current.year ?? String(new Date().getFullYear());
  const fromValue = current.from ?? toIsoDate(currentWeekRange().start);
  const toValue = current.to ?? toIsoDate(currentWeekRange().end);

  const pushPeriod = useCallback(
    (next: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(next)) {
        if (!value) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      ["week", "month", "year", "from", "to"].forEach((key) => {
        if (!(key in next)) {
          params.delete(key);
        }
      });

      const query = params.toString();
      startTransition(() => {
        router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const rangeLabel = useMemo(() => current.periodLabel, [current.periodLabel]);

  return (
    <div
      className={`ws-task-filter-bar ws-em-period-filter${pending ? " is-loading" : ""}`}
      aria-label="EM period filter"
    >
      <div className="ws-em-period-filter-layout">
        <div className="ws-filter-group">
          <span className="ws-filter-group-label">Period</span>
          <div className="ws-filter-select-wrap">
            <select
              aria-label="EM period type"
              className="ws-filter-select"
              value={current.type}
              onChange={(event) => {
                const type = event.target.value as EmPeriodType;
                if (type === "weekly") {
                  pushPeriod({ period: type, week: weekValue });
                  return;
                }
                if (type === "monthly") {
                  pushPeriod({ period: type, month: monthValue });
                  return;
                }
                if (type === "yearly") {
                  pushPeriod({ period: type, year: yearValue });
                  return;
                }
                pushPeriod({ period: type, from: fromValue, to: toValue });
              }}
            >
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="ws-filter-select-icon" size={16} />
          </div>
        </div>

        {current.type === "weekly" ? (
          <div className="ws-filter-group">
            <span className="ws-filter-group-label">Week</span>
            <input
              aria-label="Select week"
              className="ws-em-period-input"
              type="week"
              value={weekValue}
              onChange={(event) =>
                pushPeriod({ period: "weekly", week: event.target.value })
              }
            />
          </div>
        ) : null}

        {current.type === "monthly" ? (
          <div className="ws-filter-group">
            <span className="ws-filter-group-label">Month</span>
            <input
              aria-label="Select month"
              className="ws-em-period-input"
              type="month"
              value={monthValue}
              onChange={(event) =>
                pushPeriod({ period: "monthly", month: event.target.value })
              }
            />
          </div>
        ) : null}

        {current.type === "yearly" ? (
          <div className="ws-filter-group">
            <span className="ws-filter-group-label">Year</span>
            <input
              aria-label="Select year"
              className="ws-em-period-input"
              max={2100}
              min={2000}
              type="number"
              value={yearValue}
              onChange={(event) =>
                pushPeriod({ period: "yearly", year: event.target.value })
              }
            />
          </div>
        ) : null}

        {current.type === "custom" ? (
          <>
            <div className="ws-filter-group">
              <span className="ws-filter-group-label">From</span>
              <input
                aria-label="From date"
                className="ws-em-period-input"
                type="date"
                value={fromValue}
                onChange={(event) =>
                  pushPeriod({
                    period: "custom",
                    from: event.target.value,
                    to: toValue,
                  })
                }
              />
            </div>
            <div className="ws-filter-group">
              <span className="ws-filter-group-label">To</span>
              <input
                aria-label="To date"
                className="ws-em-period-input"
                type="date"
                value={toValue}
                onChange={(event) =>
                  pushPeriod({
                    period: "custom",
                    from: fromValue,
                    to: event.target.value,
                  })
                }
              />
            </div>
          </>
        ) : null}

        <div className="ws-em-period-range-pill" title="Selected period range">
          <CalendarRange size={15} aria-hidden />
          <span>
            <strong>Start</strong> {current.startIso}
            <span className="ws-em-period-range-sep" aria-hidden>
              -
            </span>
            <strong>End</strong> {current.endIso}
          </span>
          <em>{rangeLabel}</em>
        </div>
      </div>
    </div>
  );
}
