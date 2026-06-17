import Link from "next/link";
import { MisScoreBadge } from "@/components/saas/mis-score-badge";
import { misScoreFromPoints } from "@/lib/mis/score";
import type { getFmsMisSummary } from "@/lib/fms/queries";

type MisSummary = Awaited<ReturnType<typeof getFmsMisSummary>>;

export function FmsReportsMisPanel({ summary }: { summary: MisSummary }) {
  return (
    <article className="saas-panel saas-reports-panel ws-fms-reports-panel">
      <p className="saas-report-kicker">FMS pipeline MIS</p>
      <h3>Live workflow performance</h3>
      <p className="saas-panel-lead">
        On-time scores from active FMS lines. Drill into a line or open the full MIS board.
      </p>

      <div className="ws-sf-metrics ws-fms-metrics ws-fms-reports-metrics">
        <div className="ws-sf-metric-tile">
          <span>Org FMS score</span>
          <strong>{summary.avgScore}</strong>
          <MisScoreBadge score={misScoreFromPoints(summary.avgScore, "Org average")} compact />
        </div>
        <div className="ws-sf-metric-tile">
          <span>Active lines</span>
          <strong>{summary.lineCount}</strong>
        </div>
        <div className="ws-sf-metric-tile">
          <span>Overdue stops</span>
          <strong>{summary.overdueCount}</strong>
        </div>
      </div>

      {summary.lines.length > 0 ? (
        <div className="ws-sf-table-wrap">
          <table className="ws-fms-data-table ws-sf-data-table ws-mis-score-table">
            <thead>
              <tr>
                <th>Line</th>
                <th>Current stop</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {summary.lines.slice(0, 8).map((line) => (
                <tr key={line.id}>
                  <td>
                    <Link href={`/app/fms/instances/${line.id}`} className="ws-sf-record-link">
                      {line.label}
                    </Link>
                  </td>
                  <td className="ws-fms-table-meta">{line.currentStep}</td>
                  <td>
                    <MisScoreBadge score={misScoreFromPoints(line.score)} compact />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="ws-fms-muted">No active FMS lines yet.</p>
      )}

      <div className="ws-fms-reports-actions">
        <Link href="/app/fms/scores" className="btn-cta btn-secondary">
          Full FMS MIS board
        </Link>
        <Link href="/app/fms/lines" className="btn-cta btn-secondary">
          Live pipelines
        </Link>
      </div>
    </article>
  );
}
