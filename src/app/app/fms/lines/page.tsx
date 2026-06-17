import Link from "next/link";
import { FmsLineCard } from "@/components/saas/fms-line-card";
import { FmsPagination } from "@/components/saas/fms-pagination";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { listFmsInstancesPage } from "@/lib/fms/queries";
import { isStepOverdue } from "@/lib/fms/step-display";
import { fmsPageFromSearchParam } from "@/lib/scale";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ page?: string; completedPage?: string }>;
};

export default async function FmsLinesPage({ searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "FMS" });

  if (!hasMinimumRole(user.role, "MANAGER")) {
    redirect("/app/fms/my-stops");
  }

  const params = await searchParams;
  const page = fmsPageFromSearchParam(params.page);
  const completedPageNum = fmsPageFromSearchParam(params.completedPage);
  const [activePage, completedPage] = await Promise.all([
    listFmsInstancesPage(user.organizationId, { status: "ACTIVE", page }),
    listFmsInstancesPage(user.organizationId, {
      status: "COMPLETED",
      page: completedPageNum,
    }),
  ]);

  const activeJobs = activePage.items;
  const completedJobs = completedPage.items;
  const overdueCount = activeJobs.filter((job) => {
    const current = job.stepStates.find((s) => s.status === "IN_PROGRESS");
    if (!current) {
      return false;
    }
    return isStepOverdue(
      current.status,
      current.plannedAt,
      current.actualAt,
      current.delayMinutes,
    );
  }).length;

  return (
    <div className="saas-page ws-fms-page ws-fms-sf">
      <TaskPageToolbar
        title="Live pipelines"
        description="See every active workflow and where it is in the route right now."
        actions={
          <Link href="/app/fms/ops" className="btn-secondary btn-sm">
            Ops monitor
          </Link>
        }
      />

      <div className="ws-sf-metrics ws-fms-metrics">
        <div className="ws-sf-metric-tile">
          <span>Active lines</span>
          <strong>{activePage.total}</strong>
          <span className="ws-stat-card-hint">Running now</span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>Overdue stops</span>
          <strong>{overdueCount}</strong>
          <span className="ws-stat-card-hint">
            {overdueCount > 0 ? "Needs attention" : "All on track"}
          </span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>Completed</span>
          <strong>{completedPage.total}</strong>
          <span className="ws-stat-card-hint">All time</span>
        </div>
      </div>

      {activeJobs.length === 0 ? (
        <div className="ws-empty-state ws-fms-empty-state">
          <p>No active lines yet. Submit a live form to start a journey.</p>
          <Link href="/app/fms/setup" className="btn-primary btn-sm ws-sf-btn-primary">
            Go to setup
          </Link>
        </div>
      ) : (
        <>
          <section className="ws-fms-lines-grid" aria-label="Active workflow lines">
            {activeJobs.map((job) => (
              <FmsLineCard
                key={job.id}
                instanceId={job.id}
                title={job.referenceLabel ?? job.template.name}
                workflowName={job.template.name}
                status={job.status}
                stepStates={job.stepStates}
              />
            ))}
          </section>
          <FmsPagination
            page={activePage.page}
            totalPages={activePage.totalPages}
            total={activePage.total}
            searchParams={params}
            basePath="/app/fms/lines"
          />
        </>
      )}

      {completedJobs.length > 0 ? (
        <section className="ws-fms-lines-section" aria-label="Recently completed">
          <header className="ws-fms-section-heading">
            <h2>Recently completed</h2>
            <p>Journeys that reached the destination.</p>
          </header>
          <div className="ws-fms-lines-grid">
            {completedJobs.map((job) => (
              <FmsLineCard
                key={job.id}
                instanceId={job.id}
                title={job.referenceLabel ?? job.template.name}
                workflowName={job.template.name}
                status={job.status}
                stepStates={job.stepStates}
              />
            ))}
          </div>
          <FmsPagination
            page={completedPage.page}
            totalPages={completedPage.totalPages}
            total={completedPage.total}
            searchParams={params}
            basePath="/app/fms/lines"
            pageParam="completedPage"
            label="completed lines"
          />
        </section>
      ) : null}
    </div>
  );
}
