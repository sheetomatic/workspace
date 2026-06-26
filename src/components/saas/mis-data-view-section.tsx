import Link from "next/link";
import { MisDoerFilter } from "@/components/saas/mis-doer-filter";
import { MisScoreBadge } from "@/components/saas/mis-score-badge";
import { misScoreFromPoints } from "@/lib/mis/score";
import {
  formatDeficitPct,
  hasMisActiveFilters,
  type MisDetailRow,
  type MisDoerOption,
} from "@/lib/mis/reports-data";

function categoryPillClass(category: MisDetailRow["category"]) {
  if (category === "FMS") {
    return "ws-mis-cat-pill is-fms";
  }
  if (category === "PC") {
    return "ws-mis-cat-pill is-pc";
  }
  return "ws-mis-cat-pill is-task";
}

function metricLabel(metric?: string) {
  if (metric === "delayed") {
    return "Delayed";
  }
  if (metric === "onTime") {
    return "On time";
  }
  if (metric === "deficit") {
    return "With deficit";
  }
  return null;
}

export function MisDataViewSection({
  rows,
  basePath,
  doerOptions,
  activeFilters,
}: {
  rows: MisDetailRow[];
  basePath: string;
  doerOptions: MisDoerOption[];
  activeFilters: {
    category?: string;
    metric?: string;
    doer?: string;
  };
}) {
  const filtersActive = hasMisActiveFilters(activeFilters);
  const metricChip = metricLabel(activeFilters.metric);
  const categoryChip = activeFilters.category
    ? activeFilters.category.charAt(0).toUpperCase() + activeFilters.category.slice(1)
    : null;

  return (
    <section className="ws-sf-list-view ws-mis-data-view" aria-label="MIS drill down">
      <header className="ws-sf-list-view-header ws-mis-data-view-header">
        <div className="ws-mis-data-view-heading">
          <div className="ws-sf-list-view-title">
            <h2>Data view</h2>
            <span className="ws-sf-list-view-count">
              {rows.length} item{rows.length === 1 ? "" : "s"}
            </span>
          </div>
          {filtersActive ? (
            <div className="ws-mis-active-filters" aria-label="Active filters">
              {categoryChip ? (
                <span className="ws-mis-filter-chip">{categoryChip}</span>
              ) : null}
              {metricChip ? (
                <span className="ws-mis-filter-chip">{metricChip}</span>
              ) : null}
              {activeFilters.doer && activeFilters.doer !== "all" ? (
                <span className="ws-mis-filter-chip">
                  {doerOptions.find((option) => option.id === activeFilters.doer)?.label ??
                    "Doer"}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="ws-mis-data-view-toolbar">
          <MisDoerFilter options={doerOptions} currentDoer={activeFilters.doer} />
          {filtersActive ? (
            <Link href={basePath} className="btn-secondary btn-sm">
              Clear filter
            </Link>
          ) : null}
        </div>
      </header>

        {rows.length === 0 ? (
          <div className="ws-empty-state">
            <p>No matching MIS data.</p>
            {filtersActive ? (
              <Link href={basePath} className="btn-secondary btn-sm">
                Clear filter
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="ws-sf-table-wrap ws-mis-table-scroll">
            <table className="ws-fms-data-table ws-sf-data-table ws-mis-score-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Name</th>
                  <th>Owner</th>
                  <th>Status / current stop</th>
                  <th className="ws-mis-col-num">Score</th>
                  <th className="ws-mis-col-num">Deficit</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const deficit = Math.max(0, 100 - row.score);
                  return (
                    <tr key={`${row.category}-${row.id}`} className="ws-mis-data-row">
                      <td>
                        <span className={categoryPillClass(row.category)}>{row.category}</span>
                      </td>
                      <td className="ws-mis-name-cell">
                        <Link href={row.href} className="ws-sf-record-link">
                          {row.title}
                        </Link>
                      </td>
                      <td className="ws-mis-owner-cell">{row.owner}</td>
                      <td className="ws-fms-table-meta ws-mis-status-cell">{row.status}</td>
                      <td className="ws-mis-col-num">
                        <MisScoreBadge
                          score={misScoreFromPoints(row.score, row.delayed ? "Delayed" : "On time")}
                          compact
                          showLabel={false}
                        />
                      </td>
                      <td className="ws-mis-col-num">
                        <span
                          className={`ws-mis-deficit-value${deficit > 0 ? " is-negative" : ""}`}
                        >
                          {formatDeficitPct(deficit)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`ws-sf-badge ws-mis-result-badge${row.delayed ? " ws-sf-badge-danger" : " ws-mis-result-on-time"}`}
                        >
                          {row.delayed ? "Delayed" : "On time"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
  );
}
