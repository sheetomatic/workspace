import Link from "next/link";
import {
  MisCategorySummaryTable,
  MisDataViewTable,
} from "@/components/saas/mis-category-table";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { requireSession } from "@/lib/require-session";
import { canAccessEmReady } from "@/lib/em/em-access";
import {
  buildTaskMisRows,
  categorySummary,
  filterMisRows,
} from "@/lib/mis/reports-data";
import { canCreateTasks, listDelegatedTasks } from "@/lib/tasks";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ category?: string; metric?: string }>;
};

export default async function TasksScoresPage({ searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "TASKS" });

  if (!canCreateTasks(user.role)) {
    redirect("/app/tasks/my-work");
  }

  const params = await searchParams;
  const taskPage = await listDelegatedTasks(
    user,
    { includeCompleted: true },
    { page: 1, pageSize: 500 },
  );

  const taskRows = buildTaskMisRows(taskPage.items);
  const summary = categorySummary("Task", taskRows);
  const detailRows = filterMisRows(taskRows, params);
  const showEmReady = canAccessEmReady(user);

  return (
    <div className="saas-page ws-mis-page ws-tasks-sf">
      <TaskPageToolbar
        title="MIS scores"
        description="Task performance with deficit tracking. Click any number to drill down."
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
        basePath="/app/tasks/scores"
        itemCount={taskRows.length}
        summaries={[summary]}
      />

      <MisDataViewTable basePath="/app/tasks/scores" rows={detailRows} />

      <p className="ws-fms-muted ws-mis-score-footnote">
        Task MIS: on-time completion = 100, minus ~2 pts/hour late. Deficit % is
        shown as a negative gap from 100.
      </p>
    </div>
  );
}
