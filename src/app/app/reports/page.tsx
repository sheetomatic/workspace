import Link from "next/link";
import { PageHeader } from "@/components/saas/page-header";
import {
  MisCategorySummaryTable,
  MisDataViewSection,
} from "@/components/saas/mis-category-table";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { listFmsInstancesPage } from "@/lib/fms/queries";
import { hasWorkspaceModule } from "@/lib/workspace-modules";
import {
  buildFmsMisRows,
  buildTaskMisRows,
  categorySummary,
  filterMisRows,
  misDoerOptions,
} from "@/lib/mis/reports-data";
import { listDelegatedTasks } from "@/lib/tasks";

type ReportsPageProps = {
  searchParams: Promise<{ category?: string; metric?: string; doer?: string }>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const user = await requireSession("VIEWER", { module: "REPORTS" });
  const params = await searchParams;
  const tasksEnabled = hasWorkspaceModule(user, "TASKS");
  const fmsEnabled = hasWorkspaceModule(user, "FMS");

  const [taskPage, fmsPage] = await Promise.all([
    tasksEnabled
      ? listDelegatedTasks(user, { includeCompleted: true }, { page: 1, pageSize: 500 })
      : Promise.resolve({ items: [] }),
    fmsEnabled
      ? listFmsInstancesPage(user.organizationId, {
          status: "ALL",
          page: 1,
          pageSize: 500,
        })
      : Promise.resolve({ items: [] }),
  ]);

  const taskRows = buildTaskMisRows(taskPage.items);
  const fmsRows = buildFmsMisRows(fmsPage.items);
  const allRows = [...taskRows, ...fmsRows];
  const summaries = [
    categorySummary("Task", taskRows),
    categorySummary("FMS", fmsRows),
  ].filter(
    (row) => row.total > 0 || row.category === "Task" || row.category === "FMS",
  );
  const detailRows = filterMisRows(allRows, {
    category: params.category,
    metric: params.metric,
    doer: params.doer,
  });
  const metricFiltered = filterMisRows(allRows, {
    category: params.category,
    metric: params.metric,
  });
  const doerOptions = misDoerOptions(metricFiltered);

  return (
    <div className="saas-page ws-mis-page ws-tasks-sf">
      <PageHeader
        title="Reports & MIS"
        description="Category-wise performance in numbers and percentages. Click any number to see the data behind it."
        actions={
          hasMinimumRole(user.role, "MANAGER") ? (
            <Link href="/app/em" className="btn-primary btn-sm ws-sf-btn-primary">
              EM Ready board
            </Link>
          ) : undefined
        }
      />

      <MisCategorySummaryTable
        basePath="/app/reports"
        itemCount={allRows.length}
        summaries={summaries}
      />

      <MisDataViewSection
        basePath="/app/reports"
        rows={detailRows}
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
