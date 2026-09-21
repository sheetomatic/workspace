import Link from "next/link";
import {
  MisCategorySummaryTable,
  MisDataViewSection,
} from "@/components/saas/mis-category-table";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { PcPersonMisTable } from "@/components/saas/pc-work-tables";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { canAccessEmReady } from "@/lib/em/em-access";
import { getEmReadyPayload } from "@/lib/em/em-ready-data";
import { listFmsInstancesPage } from "@/lib/fms/queries";
import {
  buildFmsMisRows,
  categorySummary,
  filterMisRows,
  misDoerOptions,
} from "@/lib/mis/reports-data";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ category?: string; metric?: string; doer?: string }>;
};

export default async function FmsScoresPage({ searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "FMS" });

  if (!hasMinimumRole(user.role, "MANAGER")) {
    redirect("/app/fms/my-stops");
  }

  const params = await searchParams;
  const payload = await getEmReadyPayload(user);
  const fmsPage = await listFmsInstancesPage(user.organizationId, {
    status: "ALL",
    page: 1,
    pageSize: 500,
  });

  const fmsRows = buildFmsMisRows(fmsPage.items);
  const summary = categorySummary("FMS", fmsRows);
  const metricFiltered = filterMisRows(fmsRows, {
    category: params.category,
    metric: params.metric,
  });
  const doerOptions = misDoerOptions(metricFiltered);
  const detailRows = filterMisRows(metricFiltered, { doer: params.doer });
  const showEmReady = canAccessEmReady(user);

  return (
    <div className="saas-page ws-mis-page ws-fms-sf">
      <TaskPageToolbar
        title="MIS scores"
        description="FMS line performance with deficit tracking. Click any number to drill down."
        actions={
          <>
            {showEmReady ? (
              <Link href="/app/em" className="btn-primary btn-sm ws-sf-btn-primary">
                EM Ready
              </Link>
            ) : null}
            <Link href="/app/reports" className="btn-secondary btn-sm">
              Reports & MIS
            </Link>
          </>
        }
      />

      <MisCategorySummaryTable
        basePath="/app/fms/scores"
        itemCount={fmsRows.length}
        summaries={[summary]}
      />

      {payload.personKra.length > 0 ? (
        <section className="ws-sf-list-view" aria-label="Doer MIS scores">
          <header className="ws-sf-list-view-header">
            <div className="ws-sf-list-view-title">
              <h2>Doer scores</h2>
              <span className="ws-sf-list-view-count">{payload.personKra.length}</span>
            </div>
            <p className="ws-em-section-lead">
              Person-wise deficit for Tasks, FMS, Check Lists, and IMS.
            </p>
          </header>
          <PcPersonMisTable
            rows={payload.personKra.map((row) => ({
              owner: row.owner,
              role: "Doer" as const,
              total: row.taskTotal + row.fmsTotal + row.checklistTotal + row.imsTotal,
              delayed:
                row.taskDelayed + row.fmsDelayed + row.checklistDelayed + row.imsDelayed,
              avgScore: Math.max(0, 100 - row.totalDeficitPct),
              deficitPct: row.totalDeficitPct,
            }))}
          />
        </section>
      ) : null}

      {payload.pcKra.length > 0 ? (
        <section className="ws-sf-list-view" aria-label="PC MIS scores">
          <header className="ws-sf-list-view-header">
            <div className="ws-sf-list-view-title">
              <h2>PC scores</h2>
              <span className="ws-sf-list-view-count">{payload.pcKra.length}</span>
            </div>
            <p className="ws-em-section-lead">
              Process Coordinator chase deficit: overdue jobs not yet marked PC done.
            </p>
          </header>
          <PcPersonMisTable
            rows={payload.pcKra.map((row) => ({
              owner: row.owner,
              role: "PC" as const,
              total: row.chaseTotal,
              delayed: row.chaseDelayed,
              avgScore: Math.max(0, 100 - row.deficitPct),
              deficitPct: row.deficitPct,
            }))}
          />
        </section>
      ) : null}

      <MisDataViewSection
        basePath="/app/fms/scores"
        rows={detailRows}
        doerOptions={doerOptions}
        activeFilters={{
          category: params.category,
          metric: params.metric,
          doer: params.doer,
        }}
      />

      <p className="ws-fms-muted ws-mis-score-footnote">
        FMS MIS score: 100 for on-time stops, minus ~2 points per hour late. Deficit
        % is shown as a negative gap from 100.
      </p>
    </div>
  );
}
