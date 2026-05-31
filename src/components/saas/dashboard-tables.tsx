import Link from "next/link";
import { formatDashboardDate } from "@/lib/workspace-data";
import type {
  DashboardFollowUpRow,
  DashboardPaymentRow,
} from "@/lib/dashboard-types";

export function DashboardTables({
  followUps,
  pendingPayments,
}: {
  followUps: DashboardFollowUpRow[];
  pendingPayments: DashboardPaymentRow[];
}) {
  return (
    <section aria-label="Operational tables" className="hs-tables-grid">
      <article className="hs-table-card">
        <header className="hs-table-head">
          <div>
            <h2>Today&apos;s follow-ups</h2>
            <p>Color by priority from remarks</p>
          </div>
          <span className="hs-table-count">{followUps.length}</span>
        </header>
        {followUps.length === 0 ? (
          <p className="ws-empty-inline">No follow-ups scheduled for today.</p>
        ) : (
          <div className="hs-table-scroll">
            <table className="hs-data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {followUps.map((row) => (
                  <tr className={`row-tone-${row.tone}`} key={row.id}>
                    <td className="cell-strong">{row.clientName}</td>
                    <td>{row.timeLabel}</td>
                    <td>
                      <span className={`hs-pill pill-${row.tone}`}>
                        {row.tone === "danger"
                          ? "Urgent"
                          : row.tone === "warning"
                            ? "Payment"
                            : "Scheduled"}
                      </span>
                    </td>
                    <td>{row.remarks ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="hs-table-card">
        <header className="hs-table-head">
          <div>
            <h2>Pending payments</h2>
            <p>Red = overdue, amber = due within 7 days</p>
          </div>
          <span className="hs-table-count">{pendingPayments.length}</span>
        </header>
        {pendingPayments.length === 0 ? (
          <p className="ws-empty-inline">No pending payments right now.</p>
        ) : (
          <>
            <div className="hs-table-scroll">
              <table className="hs-data-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Amount</th>
                    <th>Due date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPayments.map((row) => (
                    <tr className={`row-urgency-${row.urgency}`} key={row.id}>
                      <td className="cell-strong">{row.clientName}</td>
                      <td className="cell-amount">{row.amount}</td>
                      <td>{formatDashboardDate(new Date(row.dueAt))}</td>
                      <td>
                        <span className={`hs-pill pill-${row.urgency}`}>
                          {row.urgencyLabel}
                          {row.daysUntilDue < 0
                            ? ` (${Math.abs(row.daysUntilDue)}d)`
                            : row.daysUntilDue <= 7
                              ? ` (${row.daysUntilDue}d)`
                              : ""}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className="hs-table-footer">
              <Link className="hs-metric-link" href="/app/reports">
                View all reports
              </Link>
            </footer>
          </>
        )}
      </article>
    </section>
  );
}
