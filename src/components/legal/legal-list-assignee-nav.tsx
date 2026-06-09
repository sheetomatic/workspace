"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LEGAL_CASES_LIST_PATH } from "@/lib/legal-cases/list-filters";

type AssigneeRow = {
  code: string;
  count: number;
};

function buildListHref(
  searchParams: URLSearchParams,
  updates: Record<string, string | null>,
) {
  const params = new URLSearchParams(searchParams.toString());
  params.delete("page");

  for (const [key, value] of Object.entries(updates)) {
    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `${LEGAL_CASES_LIST_PATH}?${query}` : LEGAL_CASES_LIST_PATH;
}

function assigneeHref(
  searchParams: URLSearchParams,
  code: string,
  isActive: boolean,
) {
  if (isActive) {
    return buildListHref(searchParams, { assignee: null });
  }

  return buildListHref(searchParams, {
    assignee: code,
    section: null,
    metric: null,
    fileStatus: null,
    caseStage: null,
  });
}

export function LegalListAssigneeNav({
  rows,
  total,
}: {
  rows: AssigneeRow[];
  total: number;
}) {
  const searchParams = useSearchParams();
  const activeAssignee = (searchParams.get("assignee") ?? "").toUpperCase();
  const allActive = !activeAssignee;

  return (
    <nav aria-label="Assignees" className="legal-list-assignee-nav">
      <Link
        aria-current={allActive ? "true" : undefined}
        className={`legal-list-assignee-chip${allActive ? " is-active" : ""}`}
        href={buildListHref(searchParams, { assignee: null })}
        title="Show all assignees"
      >
        <span className="legal-list-assignee-chip-code">All</span>
        <span className="legal-list-assignee-chip-label">assignees</span>
        <span className="legal-list-assignee-chip-count">{total.toLocaleString()}</span>
      </Link>

      {rows.map((row) => {
        const isActive = activeAssignee === row.code.toUpperCase();
        const href = assigneeHref(searchParams, row.code, isActive);
        const disabled = row.count <= 0;

        if (disabled) {
          return (
            <span
              key={row.code}
              className="legal-list-assignee-chip is-disabled"
              title={`No cases for ${row.code}`}
            >
              <span className="legal-list-assignee-chip-code">{row.code}</span>
              <span className="legal-list-assignee-chip-count">0</span>
            </span>
          );
        }

        return (
          <Link
            key={row.code}
            aria-current={isActive ? "true" : undefined}
            className={`legal-list-assignee-chip${isActive ? " is-active" : ""}`}
            href={href}
            title={
              isActive
                ? `Clear ${row.code} filter`
                : `Show cases for ${row.code}`
            }
          >
            <span className="legal-list-assignee-chip-code">{row.code}</span>
            <span className="legal-list-assignee-chip-count">
              {row.count.toLocaleString()}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
