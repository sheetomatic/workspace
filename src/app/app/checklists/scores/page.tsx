import Link from "next/link";
import {
  MisCategorySummaryTable,
  MisDataViewTable,
} from "@/components/saas/mis-category-table";
import { PcPersonMisTable } from "@/components/saas/pc-work-tables";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { buildChecklistMisRows } from "@/lib/checklists/mis";
import { buildPcMisDetailRows, buildPcPersonMisRows } from "@/lib/checklists/pc-mis";
import { listChecklistOccurrencesForMis } from "@/lib/checklists/queries";
import { canAccessEmReady } from "@/lib/em/em-access";
import { categorySummary, filterMisRows } from "@/lib/mis/reports-data";
import { requireSession } from "@/lib/require-session";
import { canCreateTasks } from "@/lib/tasks";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ category?: string; metric?: string }>;
};

export default async function ChecklistScoresPage({ searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "TASKS" });
  if (!canCreateTasks(user.role)) {
    redirect("/app/checklists/my-tasks");
  }

  const params = await searchParams;
  const occurrences = await listChecklistOccurrencesForMis(user.organizationId);
  const checklistRows = buildChecklistMisRows(occurrences);
  const detailRows = buildPcMisDetailRows(occurrences);
  const summary = categorySummary("PC", detailRows);
  const personRows = buildPcPersonMisRows(checklistRows);
  const filteredRows = filterMisRows(detailRows, params);
  const showEmReady = canAccessEmReady(user);

  return (
    <div className="saas-page ws-mis-page ws-checklists-page ws-tasks-sf">
      <TaskPageToolbar
        title="PC MIS scores"
        description="Process Checklist planned vs actual - separate from EA Task MIS and FMS MIS. Deficit from 100%."
        actions={
          <>
            {showEmReady ? (
              <Link href="/app/em" className="btn-primary btn-sm ws-sf-btn-primary">
                EM Ready
              </Link>
            ) : null}
            <Link href="/app/checklists" className="btn-secondary btn-sm">
              PC monitor
            </Link>
            <Link href="/app/tasks/scores" className="btn-secondary btn-sm">
              EA MIS
            </Link>
          </>
        }
      />

      <MisCategorySummaryTable
        basePath="/app/checklists/scores"
        itemCount={detailRows.length}
        summaries={[summary]}
      />

      <section className="ws-sf-list-view" aria-label="PC person-wise MIS">
        <header className="ws-sf-list-view-header">
          <div className="ws-sf-list-view-title">
            <h2>Person-wise PC deficit</h2>
            <span className="ws-sf-list-view-count">{personRows.length}</span>
          </div>
          <p className="ws-em-section-lead">
            Each doer&apos;s checklist completion score rolls up here for EM KRA.
          </p>
        </header>
        <PcPersonMisTable rows={personRows} />
      </section>

      <MisDataViewTable basePath="/app/checklists/scores" rows={filteredRows} />

      <p className="ws-fms-muted ws-mis-score-footnote">
        PC MIS: on-time checklist completion = 100, minus ~2 pts/hour late. EA tasks and FMS steps have
        their own MIS pages - PC monitors all three for timely completion.
      </p>
    </div>
  );
}
