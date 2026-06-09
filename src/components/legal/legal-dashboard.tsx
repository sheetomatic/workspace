import Link from "next/link";
import type { LegalDashboardStats } from "@/lib/legal-cases/queries";
import { isLegalAdmin } from "@/lib/legal-cases/access";
import { LEGAL_CASES_LIST_PATH } from "@/lib/legal-cases/list-filters";
import type { SessionUser } from "@/lib/auth";
import { LegalBreakdownChart } from "@/components/legal/legal-breakdown-chart";
import { LegalSectionStrip } from "@/components/legal/legal-section-strip";
import { LegalAssigneeList } from "@/components/legal/legal-assignee-list";
import "./legal-cases.css";

function statusBadgeClass(status: string | null | undefined) {
  const value = status?.toUpperCase() ?? "";
  if (value === "RUNNING") return "legal-badge status-running";
  if (value === "CLOSED") return "legal-badge status-closed";
  if (value === "ORDER") return "legal-badge status-order";
  if (value.includes("APPEAL")) return "legal-badge status-appeal";
  return "legal-badge status-default";
}

function breakdownTotal(rows: { count: number }[]) {
  return rows.reduce((sum, row) => sum + row.count, 0);
}

export function LegalDashboard({
  user,
  stats,
}: {
  user: SessionUser;
  stats: LegalDashboardStats;
}) {
  const admin = isLegalAdmin(user);
  const statusTotal = breakdownTotal(stats.statusBreakdown);
  const stageTotal = breakdownTotal(stats.stageBreakdown);
  const previewCases = stats.recentCases.slice(0, 6);
  const sectionRows = admin ? stats.sectionBreakdown : stats.mySectionCounts;

  return (
    <section className="legal-dashboard">
      <div className="legal-dash-toolbar">
        <p className="legal-dash-summary">
          {admin ? (
            <>
              <strong>{stats.totalCases.toLocaleString()}</strong> firm cases
              <span className="legal-dash-dot" aria-hidden="true">
                ·
              </span>
              <span>{stats.visibleTotal.toLocaleString()} in view</span>
            </>
          ) : (
            <>
              <strong>{stats.visibleTotal.toLocaleString()}</strong> my cases
            </>
          )}
        </p>
        <Link className="legal-dash-open-list" href={LEGAL_CASES_LIST_PATH}>
          Open case list
        </Link>
      </div>

      <div className="legal-chart-grid">
        <LegalBreakdownChart
          kind="status"
          rows={stats.statusBreakdown}
          title="Status"
          tone="status"
          total={statusTotal}
        />
        <LegalBreakdownChart
          kind="stage"
          rows={stats.stageBreakdown}
          title="Stage"
          tone="stage"
          total={stageTotal}
        />
      </div>

      {sectionRows.length > 0 ? (
        <LegalSectionStrip rows={sectionRows} />
      ) : null}

      {admin && stats.assigneeBreakdown.length > 0 ? (
        <LegalAssigneeList rows={stats.assigneeBreakdown} total={stats.assigneeCaseTotal} />
      ) : null}

      <div className="legal-card legal-card-recent">
        <div className="legal-card-head">
          <h3>{admin ? "Recent cases" : "My recent"}</h3>
          <Link className="legal-panel-link" href={LEGAL_CASES_LIST_PATH}>
            View all
          </Link>
        </div>
        <div className="legal-table-scroll legal-table-scroll-short">
          <table className="crm-data-table hs-data-table legal-table-compact">
            <thead>
              <tr>
                <th>File</th>
                <th>Applicant</th>
                <th>Status</th>
                <th>Stage</th>
                <th>Next</th>
              </tr>
            </thead>
            <tbody>
              {previewCases.length === 0 ? (
                <tr>
                  <td colSpan={5}>No cases yet.</td>
                </tr>
              ) : (
                previewCases.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link className="legal-case-link" href={`/app/cases/${item.id}`}>
                        {item.fileNumber}
                        {item.mccNumber ? `/${item.mccNumber}` : ""}
                      </Link>
                    </td>
                    <td className="legal-cell-truncate">{item.applicant ?? "-"}</td>
                    <td>
                      <span className={statusBadgeClass(item.fileStatus)}>
                        {item.fileStatus ?? "-"}
                      </span>
                    </td>
                    <td>{item.caseStage ?? "-"}</td>
                    <td>{item.nextDate ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
