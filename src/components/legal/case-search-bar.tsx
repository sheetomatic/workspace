import Link from "next/link";
import {
  LEGAL_CASES_LIST_PATH,
  buildLegalListQuery,
  metricLabel,
  sectionFilterLabel,
} from "@/lib/legal-cases/list-filters";
import type { LegalListMetric } from "@/lib/legal-cases/queries";

export function CaseSearchBar({
  q,
  fileStatus,
  caseStage,
  mineOnly,
  assignee,
  section,
  metric,
  isAdmin,
}: {
  q?: string;
  fileStatus?: string;
  caseStage?: string;
  mineOnly?: boolean;
  assignee?: string;
  section?: string;
  metric?: string;
  isAdmin: boolean;
}) {
  const hasAssigneeFilter = Boolean(assignee);
  const hasFileStatusFilter = Boolean(fileStatus);
  const hasCaseStageFilter = Boolean(caseStage);
  const hasMetricFilter =
    metric === "running" ||
    metric === "closed" ||
    metric === "appeal" ||
    metric === "hearings";
  const hasSectionFilter = Boolean(section && Number(section) >= 2 && Number(section) <= 7);
  const hasSearchFilters = Boolean(
    q || fileStatus || caseStage || mineOnly || hasAssigneeFilter || hasMetricFilter,
  );
  const hasActiveChips =
    hasAssigneeFilter ||
    hasFileStatusFilter ||
    hasCaseStageFilter ||
    hasMetricFilter ||
    hasSectionFilter;

  const clearAllHref = buildLegalListQuery({});

  return (
    <>
      {hasActiveChips ? (
        <div className="legal-active-filters">
          <span className="legal-active-filters-label">Filters</span>
          {hasAssigneeFilter ? (
            <Link
              className="legal-filter-chip"
              href={buildLegalListQuery({
                q,
                fileStatus,
                caseStage,
                mine: mineOnly ? "1" : undefined,
                section,
                metric,
              })}
              title="Remove assignee filter"
            >
              Assignee {assignee}
              <span aria-hidden="true" className="legal-filter-chip-x">
                x
              </span>
            </Link>
          ) : null}
          {hasFileStatusFilter ? (
            <Link
              className="legal-filter-chip"
              href={buildLegalListQuery({
                q,
                caseStage,
                mine: mineOnly ? "1" : undefined,
                assignee,
                section,
                metric,
              })}
              title="Remove status filter"
            >
              Status {fileStatus}
              <span aria-hidden="true" className="legal-filter-chip-x">
                x
              </span>
            </Link>
          ) : null}
          {hasCaseStageFilter ? (
            <Link
              className="legal-filter-chip"
              href={buildLegalListQuery({
                q,
                fileStatus,
                mine: mineOnly ? "1" : undefined,
                assignee,
                section,
                metric,
              })}
              title="Remove stage filter"
            >
              Stage {caseStage}
              <span aria-hidden="true" className="legal-filter-chip-x">
                x
              </span>
            </Link>
          ) : null}
          {hasMetricFilter ? (
            <Link
              className="legal-filter-chip"
              href={buildLegalListQuery({
                q,
                fileStatus,
                caseStage,
                mine: mineOnly ? "1" : undefined,
                assignee,
                section,
              })}
              title="Remove metric filter"
            >
              {metricLabel(metric as LegalListMetric)}
              <span aria-hidden="true" className="legal-filter-chip-x">
                x
              </span>
            </Link>
          ) : null}
          {hasSectionFilter ? (
            <Link
              className="legal-filter-chip legal-filter-chip-section"
              href={buildLegalListQuery({
                q,
                fileStatus,
                caseStage,
                mine: mineOnly ? "1" : undefined,
                assignee,
                metric,
              })}
              title="Remove section filter"
            >
              {sectionFilterLabel(Number(section))}
              <span aria-hidden="true" className="legal-filter-chip-x">
                x
              </span>
            </Link>
          ) : null}
        </div>
      ) : null}

      <form action={LEGAL_CASES_LIST_PATH} className="legal-search-bar" method="get">
        <div className="legal-search-bar-fields">
          <input
            className="legal-search-input"
            defaultValue={q ?? ""}
            name="q"
            placeholder="Search file no., MCC, applicant, court..."
            type="search"
          />
          <select defaultValue={fileStatus ?? ""} name="fileStatus">
            <option value="">All statuses</option>
            <option value="RUNNING">RUNNING</option>
            <option value="CLOSED">CLOSED</option>
            <option value="ORDER">ORDER</option>
            <option value="APPEAL FILED">APPEAL FILED</option>
            <option value="HIGH COURT">HIGH COURT</option>
          </select>
          <select defaultValue={caseStage ?? ""} name="caseStage">
            <option value="">All stages</option>
            <option value="ROOM">ROOM</option>
            <option value="DEPOSIT">DEPOSIT</option>
            <option value="HC">HC</option>
            <option value="ORDER">ORDER</option>
            <option value="LOST">LOST</option>
            <option value="FD BREAK">FD BREAK</option>
          </select>
        </div>

        <div className="legal-search-bar-actions">
          {isAdmin ? (
            <label className="legal-search-checkbox">
              <input defaultChecked={mineOnly} name="mine" type="checkbox" value="1" />
              <span>Only my assigned</span>
            </label>
          ) : null}
          {assignee ? <input name="assignee" type="hidden" value={assignee} /> : null}
          {section ? <input name="section" type="hidden" value={section} /> : null}
          {hasMetricFilter ? <input name="metric" type="hidden" value={metric} /> : null}
          <button className="legal-search-submit" type="submit">
            Search
          </button>
          {hasSearchFilters || section ? (
            <Link className="legal-search-clear" href={clearAllHref}>
              Clear all
            </Link>
          ) : null}
        </div>
      </form>
    </>
  );
}
