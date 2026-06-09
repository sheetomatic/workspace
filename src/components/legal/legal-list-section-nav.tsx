"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { LegalSectionNumber } from "@/lib/legal-cases/constants";
import { LEGAL_CASES_LIST_PATH } from "@/lib/legal-cases/list-filters";

type SectionRow = {
  section: LegalSectionNumber;
  label: string;
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

function sectionHref(
  searchParams: URLSearchParams,
  section: LegalSectionNumber,
  isActive: boolean,
) {
  if (isActive) {
    return buildListHref(searchParams, { section: null });
  }

  return buildListHref(searchParams, {
    section: String(section),
    assignee: null,
    metric: null,
    fileStatus: null,
    caseStage: null,
  });
}

export function LegalListSectionNav({
  rows,
  total,
}: {
  rows: SectionRow[];
  total: number;
}) {
  const searchParams = useSearchParams();
  const activeSection = searchParams.get("section") ?? "";
  const allActive = !activeSection;

  return (
    <nav aria-label="Sections" className="legal-list-section-nav">
      <Link
        aria-current={allActive ? "true" : undefined}
        className={`legal-list-section-chip${allActive ? " is-active" : ""}`}
        href={buildListHref(searchParams, { section: null })}
        title="Show all sections"
      >
        <span className="legal-list-section-chip-code">All</span>
        <span className="legal-list-section-chip-label">sections</span>
        <span className="legal-list-section-chip-count">{total.toLocaleString()}</span>
      </Link>

      {rows.map((row) => {
        const isActive = activeSection === String(row.section);
        const href = sectionHref(searchParams, row.section, isActive);
        const disabled = row.count <= 0;

        if (disabled) {
          return (
            <span
              key={row.section}
              className="legal-list-section-chip is-disabled"
              title={`No cases in S${row.section}`}
            >
              <span className="legal-list-section-chip-code">S{row.section}</span>
              <span className="legal-list-section-chip-label" title={row.label}>
                {row.label}
              </span>
              <span className="legal-list-section-chip-count">0</span>
            </span>
          );
        }

        return (
          <Link
            key={row.section}
            aria-current={isActive ? "true" : undefined}
            className={`legal-list-section-chip${isActive ? " is-active" : ""}`}
            href={href}
            title={
              isActive
                ? `Clear S${row.section} filter`
                : `Show S${row.section} - ${row.label}`
            }
          >
            <span className="legal-list-section-chip-code">S{row.section}</span>
            <span className="legal-list-section-chip-label" title={row.label}>
              {row.label}
            </span>
            <span className="legal-list-section-chip-count">
              {row.count.toLocaleString()}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
