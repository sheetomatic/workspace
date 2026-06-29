"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  leadsPeriodToSearchParams,
  shiftLeadsPeriod,
  type LeadsPeriodRange,
  type LeadsPeriodType,
} from "@/lib/leads/period";

const PERIOD_OPTIONS: { value: LeadsPeriodType; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

function periodInputValue(range: LeadsPeriodRange) {
  if (range.type === "weekly") {
    return range.week ?? "";
  }
  if (range.type === "monthly") {
    return range.month ?? "";
  }
  if (range.type === "quarterly") {
    return range.quarter ?? "";
  }
  return range.year ?? "";
}

function periodInputType(range: LeadsPeriodRange) {
  if (range.type === "weekly") {
    return "week";
  }
  if (range.type === "monthly") {
    return "month";
  }
  if (range.type === "yearly") {
    return "number";
  }
  return "text";
}

export function LeadsPeriodToolbar({ period }: { period: LeadsPeriodRange }) {
  const prevHref = useMemo(() => {
    const shifted = shiftLeadsPeriod(period, -1);
    return `/app/leads?${leadsPeriodToSearchParams(shifted).toString()}`;
  }, [period]);

  const nextHref = useMemo(() => {
    const shifted = shiftLeadsPeriod(period, 1);
    return `/app/leads?${leadsPeriodToSearchParams(shifted).toString()}`;
  }, [period]);

  const currentHref = (type: LeadsPeriodType) => {
    const params = leadsPeriodToSearchParams({ ...period, type });
    params.set("period", type);
    return `/app/leads?${params.toString()}`;
  };

  const valueChangeHref = (value: string) => {
    const params = leadsPeriodToSearchParams(period);
    if (period.type === "weekly") {
      params.set("week", value);
    } else if (period.type === "monthly") {
      params.set("month", value);
    } else if (period.type === "quarterly") {
      params.set("quarter", value);
    } else {
      params.set("year", value);
    }
    return `/app/leads?${params.toString()}`;
  };

  return (
    <section className="leads-period-toolbar" aria-label="Lead period">
      <div className="leads-period-toolbar-row">
        <div className="leads-period-types">
          {PERIOD_OPTIONS.map((option) => (
            <Link
              key={option.value}
              className={
                period.type === option.value
                  ? "leads-machine-filter active"
                  : "leads-machine-filter"
              }
              href={currentHref(option.value)}
            >
              {option.label}
            </Link>
          ))}
        </div>
        <div className="leads-period-nav">
          <Link className="btn-secondary btn-sm" href={prevHref}>
            Previous
          </Link>
          <Link className="btn-secondary btn-sm" href={nextHref}>
            Next
          </Link>
        </div>
      </div>

      <div className="leads-period-toolbar-row">
        <p className="leads-period-label">{period.periodLabel}</p>
        {period.type === "quarterly" ? (
          <select
            className="leads-period-input"
            defaultValue={period.quarter}
            onChange={(event) => {
              window.location.href = valueChangeHref(event.target.value);
            }}
          >
            {buildQuarterOptions().map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            className="leads-period-input"
            type={periodInputType(period)}
            defaultValue={periodInputValue(period)}
            min={period.type === "yearly" ? "2020" : undefined}
            max={period.type === "yearly" ? "2035" : undefined}
            onChange={(event) => {
              if (event.target.value) {
                window.location.href = valueChangeHref(event.target.value);
              }
            }}
          />
        )}
      </div>
    </section>
  );
}

function buildQuarterOptions() {
  const year = new Date().getFullYear();
  const options: string[] = [];
  for (let y = year - 1; y <= year + 1; y += 1) {
    for (let q = 1; q <= 4; q += 1) {
      options.push(`${y}-Q${q}`);
    }
  }
  return options;
}
