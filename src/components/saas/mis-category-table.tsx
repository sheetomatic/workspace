import Link from "next/link";
import {
  formatDeficitPct,
  metricHref,
  type MisCategorySummary,
  type MisDetailRow,
} from "@/lib/mis/reports-data";

export function MisCategorySummaryTable({
  summaries,
  basePath,
  itemCount,
}: {
  summaries: MisCategorySummary[];
  basePath: string;
  itemCount: number;
}) {
  return (
    <section className="ws-sf-list-view" aria-label="MIS category summary">
      <header className="ws-sf-list-view-header">
        <div className="ws-sf-list-view-title">
          <h2>MIS score by category</h2>
          <span className="ws-sf-list-view-count">
            {itemCount} item{itemCount === 1 ? "" : "s"}
          </span>
        </div>
      </header>
      <div className="ws-sf-table-wrap ws-mis-table-scroll">
        <table className="ws-fms-data-table ws-sf-data-table ws-mis-score-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Total</th>
              <th>On time</th>
              <th>Delayed</th>
              <th>Delayed %</th>
              <th>MIS score</th>
              <th>Deficit no.</th>
              <th>Deficit %</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((row) => (
              <tr key={row.category}>
                <td>{row.category}</td>
                <td>
                  <Link
                    href={metricHref(basePath, row.category, "all")}
                    className="ws-mis-metric-link"
                  >
                    {row.total}
                  </Link>
                </td>
                <td>
                  <Link
                    href={metricHref(basePath, row.category, "onTime")}
                    className="ws-mis-metric-link"
                  >
                    {row.onTime}
                  </Link>
                </td>
                <td>
                  <Link
                    href={metricHref(basePath, row.category, "delayed")}
                    className="ws-mis-metric-link"
                  >
                    {row.delayed}
                  </Link>
                </td>
                <td>
                  <Link
                    href={metricHref(basePath, row.category, "delayed")}
                    className="ws-mis-metric-link"
                  >
                    {row.delayedPct}%
                  </Link>
                </td>
                <td>{row.avgScore}</td>
                <td>
                  <Link
                    href={metricHref(basePath, row.category, "deficit")}
                    className="ws-mis-metric-link"
                  >
                    {row.deficit}
                  </Link>
                </td>
                <td>
                  <Link
                    href={metricHref(basePath, row.category, "deficit")}
                    className={`ws-mis-metric-link ws-mis-deficit-link${row.deficitPct > 0 ? " is-negative" : ""}`}
                  >
                    {formatDeficitPct(row.deficitPct)}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function MisDataViewTable({
  rows,
  basePath,
  showClearFilter = true,
}: {
  rows: MisDetailRow[];
  basePath: string;
  showClearFilter?: boolean;
}) {
  return (
    <section className="ws-sf-list-view" aria-label="MIS drill down">
      <header className="ws-sf-list-view-header">
        <div className="ws-sf-list-view-title">
          <h2>Data view</h2>
          <span className="ws-sf-list-view-count">
            {rows.length} item{rows.length === 1 ? "" : "s"}
          </span>
        </div>
        {showClearFilter ? (
          <Link href={basePath} className="btn-secondary btn-sm">
            Clear filter
          </Link>
        ) : null}
      </header>
      {rows.length === 0 ? (
        <div className="ws-empty-state">
          <p>No matching MIS data.</p>
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
                <th>Score</th>
                <th>Deficit</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const deficit = Math.max(0, 100 - row.score);
                return (
                  <tr key={`${row.category}-${row.id}`} className="ws-mis-data-row">
                    <td>{row.category}</td>
                    <td>
                      <Link href={row.href} className="ws-sf-record-link">
                        {row.title}
                      </Link>
                    </td>
                    <td className="ws-fms-table-meta">{row.owner}</td>
                    <td className="ws-fms-table-meta">{row.status}</td>
                    <td>{row.score}</td>
                    <td>
                      <span
                        className={`ws-mis-deficit-value${deficit > 0 ? " is-negative" : ""}`}
                      >
                        {formatDeficitPct(deficit)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`ws-sf-badge${row.delayed ? " ws-sf-badge-danger" : " ws-sf-badge-info"}`}
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
