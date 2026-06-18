import Link from "next/link";
import { FmsPagination } from "@/components/saas/fms-pagination";
import { FmsRecentActivity } from "@/components/saas/fms-recent-activity";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { getFmsOpsPage, getFmsPipelineCounts } from "@/lib/fms/queries";
import { listRecentFmsAudit } from "@/lib/fms/audit";
import { fmsInstanceHref } from "@/lib/fms/navigation";
import {
  formatDelayLabel,
  isStepOverdue,
  liveDelayMinutes,
} from "@/lib/fms/step-display";
import { fmsPageFromSearchParam } from "@/lib/scale";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ overduePage?: string; unassignedPage?: string }>;
};

export default async function FmsOpsPage({ searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "FMS" });

  if (!hasMinimumRole(user.role, "MANAGER")) {
    redirect("/app/fms/my-stops");
  }

  const params = await searchParams;
  const overduePage = fmsPageFromSearchParam(params.overduePage);
  const unassignedPage = fmsPageFromSearchParam(params.unassignedPage);

  const [ops, recentActivity, pipelineCounts] = await Promise.all([
    getFmsOpsPage(user.organizationId, { overduePage, unassignedPage }),
    listRecentFmsAudit(user.organizationId, 15),
    getFmsPipelineCounts(user.organizationId),
  ]);

  return (
    <div className="saas-page ws-fms-page ws-fms-sf">
      <TaskPageToolbar
        title="Ops monitor"
        description="Stuck and overdue stops across active pipelines."
        actions={
          <Link href="/app/fms/lines" className="btn-secondary btn-sm">
            Live pipelines
          </Link>
        }
      />

      <div className="ws-sf-metrics ws-fms-metrics">
        <div className="ws-sf-metric-tile">
          <span>Active FMS</span>
          <strong>{pipelineCounts.active}</strong>
          <span className="ws-stat-card-hint">Running now</span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>On track</span>
          <strong>{pipelineCounts.onTrack}</strong>
          <span className="ws-stat-card-hint">
            {pipelineCounts.onTrack > 0 ? "On time" : "None yet"}
          </span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>Delayed</span>
          <strong>{pipelineCounts.delayed}</strong>
          <span className="ws-stat-card-hint">
            {pipelineCounts.delayed > 0 ? "Needs attention" : "None overdue"}
          </span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>Pending</span>
          <strong>{pipelineCounts.pending}</strong>
          <span className="ws-stat-card-hint">Awaiting next stop</span>
        </div>
      </div>

      <div className="ws-fms-ops-stack">
        <div className="ws-fms-ops-grid">
        <section className="ws-sf-list-view" aria-label="Overdue stops">
          <header className="ws-sf-list-view-header">
            <div className="ws-sf-list-view-title">
              <h2>Overdue stops</h2>
              <span className="ws-sf-list-view-count">
                {ops.overdueTotal} item{ops.overdueTotal === 1 ? "" : "s"}
              </span>
            </div>
          </header>
          {ops.overdue.length === 0 ? (
            <div className="ws-empty-state ws-fms-empty-state is-positive">
              <p>All active stops are on track.</p>
            </div>
          ) : (
            <>
              <div className="ws-sf-table-wrap">
                <table className="ws-fms-data-table ws-sf-data-table">
                  <thead>
                    <tr>
                      <th>Line</th>
                      <th>Stop</th>
                      <th>Delay</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {ops.overdue.map((stepState) => {
                      const delay = liveDelayMinutes(
                        stepState.plannedAt,
                        stepState.actualAt,
                        stepState.delayMinutes,
                      );
                      return (
                        <tr key={stepState.id}>
                          <td>
                            <Link
                              href={fmsInstanceHref(stepState.instanceId, "ops")}
                              className="ws-sf-record-link"
                            >
                              {stepState.instance.referenceLabel ??
                                stepState.instance.template.name}
                            </Link>
                          </td>
                          <td className="ws-fms-table-meta">
                            {stepState.step.stepName}
                          </td>
                          <td>
                            <span className="ws-sf-badge ws-sf-badge-danger">
                              {formatDelayLabel(delay) ?? "Overdue"}
                            </span>
                          </td>
                          <td className="ws-fms-table-actions">
                            <Link
                              href={fmsInstanceHref(stepState.instanceId, "ops")}
                              className="btn-primary btn-sm ws-sf-btn-primary"
                            >
                              Open
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <FmsPagination
                page={ops.overduePage}
                totalPages={ops.overdueTotalPages}
                total={ops.overdueTotal}
                searchParams={params}
                basePath="/app/fms/ops"
                pageParam="overduePage"
                label="overdue stops"
              />
            </>
          )}
        </section>

        <section className="ws-sf-list-view" aria-label="Unassigned stops">
          <header className="ws-sf-list-view-header">
            <div className="ws-sf-list-view-title">
              <h2>Unassigned stops</h2>
              <span className="ws-sf-list-view-count">
                {ops.unassignedTotal} item{ops.unassignedTotal === 1 ? "" : "s"}
              </span>
            </div>
          </header>
          {ops.unassigned.length === 0 ? (
            <div className="ws-empty-state ws-fms-empty-state is-positive">
              <p>Every active stop has an owner.</p>
            </div>
          ) : (
            <>
              <div className="ws-sf-table-wrap">
                <table className="ws-fms-data-table ws-sf-data-table">
                  <thead>
                    <tr>
                      <th>Line</th>
                      <th>Stop</th>
                      <th>Status</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {ops.unassigned.map((stepState) => {
                      const overdue = isStepOverdue(
                        stepState.status,
                        stepState.plannedAt,
                        stepState.actualAt,
                        stepState.delayMinutes,
                      );
                      return (
                        <tr key={stepState.id}>
                          <td>
                            <Link
                              href={fmsInstanceHref(stepState.instanceId, "ops")}
                              className="ws-sf-record-link"
                            >
                              {stepState.instance.referenceLabel ??
                                stepState.instance.template.name}
                            </Link>
                          </td>
                          <td className="ws-fms-table-meta">
                            {stepState.step.stepName}
                          </td>
                          <td>
                            <span
                              className={`ws-sf-badge${overdue ? " ws-sf-badge-danger" : " ws-sf-badge-info"}`}
                            >
                              {overdue ? "Overdue" : "Needs owner"}
                            </span>
                          </td>
                          <td className="ws-fms-table-actions">
                            <Link
                              href={fmsInstanceHref(stepState.instanceId, "ops")}
                              className="btn-primary btn-sm ws-sf-btn-primary"
                            >
                              Assign
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <FmsPagination
                page={ops.unassignedPage}
                totalPages={ops.unassignedTotalPages}
                total={ops.unassignedTotal}
                searchParams={params}
                basePath="/app/fms/ops"
                pageParam="unassignedPage"
                label="unassigned stops"
              />
            </>
          )}
        </section>
        </div>

        <FmsRecentActivity events={recentActivity} />
      </div>
    </div>
  );
}
