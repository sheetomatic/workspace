import Link from "next/link";
import {
  formatDeficitPct,
  metricHref,
  type MisCategorySummary,
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
    <section className="ws-sf-list-view ws-mis-summary-view" aria-label="MIS category summary">
      <header className="ws-sf-list-view-header ws-mis-summary-header">
        <div className="ws-sf-list-view-title">
          <h2>MIS score by category</h2>
          <span className="ws-sf-list-view-count">
            {itemCount} item{itemCount === 1 ? "" : "s"}
          </span>
        </div>
        <p className="ws-mis-summary-hint">
          Click any number to drill down into the data view below.
        </p>
      </header>
      <div className="ws-sf-table-wrap ws-mis-table-scroll">
        <table className="ws-fms-data-table ws-sf-data-table ws-mis-score-table ws-mis-summary-table">
          <thead>
            <tr>
              <th>Category</th>
              <th className="ws-mis-col-num">Total</th>
              <th className="ws-mis-col-num">On time</th>
              <th className="ws-mis-col-num">Delayed</th>
              <th className="ws-mis-col-num">Delayed %</th>
              <th className="ws-mis-col-num">MIS score</th>
              <th className="ws-mis-col-num">Deficit no.</th>
              <th className="ws-mis-col-num">Deficit %</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((row) => (
              <tr key={row.category}>
                <td>
                  <span
                    className={`ws-mis-cat-pill${
                      row.category === "FMS"
                        ? " is-fms"
                        : row.category === "PC"
                          ? " is-pc"
                          : " is-task"
                    }`}
                  >
                    {row.category}
                  </span>
                </td>
                <td className="ws-mis-col-num">
                  <Link
                    href={metricHref(basePath, row.category, "all")}
                    className="ws-mis-metric-link"
                  >
                    {row.total}
                  </Link>
                </td>
                <td className="ws-mis-col-num">
                  <Link
                    href={metricHref(basePath, row.category, "onTime")}
                    className="ws-mis-metric-link"
                  >
                    {row.onTime}
                  </Link>
                </td>
                <td className="ws-mis-col-num">
                  <Link
                    href={metricHref(basePath, row.category, "delayed")}
                    className="ws-mis-metric-link"
                  >
                    {row.delayed}
                  </Link>
                </td>
                <td className="ws-mis-col-num">
                  <Link
                    href={metricHref(basePath, row.category, "delayed")}
                    className="ws-mis-metric-link"
                  >
                    {row.delayedPct}%
                  </Link>
                </td>
                <td className="ws-mis-col-num">{row.avgScore}</td>
                <td className="ws-mis-col-num">
                  <Link
                    href={metricHref(basePath, row.category, "deficit")}
                    className="ws-mis-metric-link"
                  >
                    {row.deficit}
                  </Link>
                </td>
                <td className="ws-mis-col-num">
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

export { MisDataViewSection } from "@/components/saas/mis-data-view-section";
