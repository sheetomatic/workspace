import Link from "next/link";
import {
  MisCategorySummaryTable,
  MisDataViewSection,
} from "@/components/saas/mis-category-table";
import { PcExceptionTable, PcPersonMisTable } from "@/components/saas/pc-work-tables";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { buildChecklistMisRows } from "@/lib/checklists/mis";
import {
  buildPcExceptionRows,
  buildPcMisDetailRows,
  buildPcPersonMisRows,
} from "@/lib/checklists/pc-mis";
import { listChecklistOccurrencesForMis } from "@/lib/checklists/queries";
import { canAccessEmReady } from "@/lib/em/em-access";
import { categorySummary, filterMisRows, misDoerOptions } from "@/lib/mis/reports-data";
import { requireSession } from "@/lib/require-session";
import { canCreateTasks } from "@/lib/tasks";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ category?: string; metric?: string; doer?: string }>;
};

export default async function ChecklistScoresPage({ searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "TASKS" });
  if (!canCreateTasks(user.role)) {
    redirect("/app/checklists/accounts");
  }

  const params = await searchParams;
  const occurrences = await listChecklistOccurrencesForMis(user.organizationId);
  const checklistRows = buildChecklistMisRows(occurrences);
  const detailRows = buildPcMisDetailRows(occurrences);
  const summary = categorySummary("PC", detailRows);
  const personRows = buildPcPersonMisRows(checklistRows);
  const exceptions = buildPcExceptionRows(checklistRows);
  const metricFiltered = filterMisRows(detailRows, {
    category: params.category,
    metric: params.metric,
  });
  const doerOptions = misDoerOptions(metricFiltered);
  const filteredRows = filterMisRows(metricFiltered, { doer: params.doer });
  const showEmReady = canAccessEmReady(user);
  const behindCount = personRows.filter((row) => row.deficitPct > 0).length;

  return (
    <div className="saas-page ws-mis-page ws-checklists-page ws-tasks-sf">
      <TaskPageToolbar
        title="Check List performance"
        description="Who is behind on Process Checklist. Person-wise deficit % — not % done. Overdue, pending, and done-late feed EM exceptions."
        actions={
          <>
            {showEmReady ? (
              <Link href="/app/em" className="btn-primary btn-sm ws-sf-btn-primary">
                EM Ready
              </Link>
            ) : null}
            <Link href="/app/checklists/accounts" className="btn-secondary btn-sm">
              Checklist rows
            </Link>
          </>
        }
      />

      <div className="ws-sf-metrics ws-pc-perf-metrics">
        <div className={`ws-sf-metric-tile${exceptions.length > 0 ? " is-active" : ""}`}>
          <span>Exceptions</span>
          <strong className={exceptions.length > 0 ? "is-late" : undefined}>
            {exceptions.length}
          </strong>
          <span className="ws-stat-card-hint">Overdue / pending / late</span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>People behind</span>
          <strong className={behindCount > 0 ? "is-late" : undefined}>{behindCount}</strong>
          <span className="ws-stat-card-hint">Deficit below 0%</span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>PC items</span>
          <strong>{checklistRows.length}</strong>
          <span className="ws-stat-card-hint">In this workspace</span>
        </div>
      </div>

      <MisCategorySummaryTable
        basePath="/app/checklists/scores"
        itemCount={detailRows.length}
        summaries={[summary]}
      />

      <section className="ws-sf-list-view" aria-label="PC person-wise deficit">
        <header className="ws-sf-list-view-header">
          <div className="ws-sf-list-view-title">
            <h2>Person-wise PC deficit</h2>
            <span className="ws-sf-list-view-count">{personRows.length}</span>
          </div>
          <p className="ws-em-section-lead">
            10 items with 2 still pending = <strong>-20%</strong>, not 80% done.
            Overdue open and done-late also count.
          </p>
        </header>
        <PcPersonMisTable rows={personRows} />
      </section>

      <section className="ws-sf-list-view" aria-label="PC exceptions">
        <header className="ws-sf-list-view-header">
          <div className="ws-sf-list-view-title">
            <h2>Exceptions</h2>
            <span className="ws-sf-list-view-count">{exceptions.length}</span>
          </div>
          <p className="ws-em-section-lead">
            Overdue, still pending, and done late — the same signals EM Ready uses.
          </p>
        </header>
        <PcExceptionTable rows={exceptions} />
      </section>

      <MisDataViewSection
        basePath="/app/checklists/scores"
        rows={filteredRows}
        doerOptions={doerOptions}
        activeFilters={{
          category: params.category,
          metric: params.metric,
          doer: params.doer,
        }}
      />
    </div>
  );
}
