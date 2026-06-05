import { Suspense } from "react";
import type { TaskStatus } from "@prisma/client";
import { PageHeader } from "@/components/saas/page-header";
import { TaskChartsPanel } from "@/components/saas/task-charts-panel";
import { TaskExportBar } from "@/components/saas/task-export-bar";
import { TaskFeedbackToast } from "@/components/saas/task-feedback-toast";
import { TaskIntegrationBanner } from "@/components/saas/task-integration-banner";
import { TaskFilters } from "@/components/saas/task-filters";
import { TaskStatsBar } from "@/components/saas/task-stats-bar";
import {
  NewTaskTrigger,
  TasksActionBar,
} from "@/components/saas/tasks-action-bar";
import { TaskPagination } from "@/components/saas/task-pagination";
import { TaskTable } from "@/components/saas/task-table";
import {
  hasQuickTaskFilter,
  taskFilterLabel,
} from "@/lib/task-filter-label";
import {
  getGoogleSheetsConnectionStatus,
  getSpreadsheetIdForOrganization,
} from "@/lib/integrations/google-sheets-dashboard";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { taskPageFromSearchParam } from "@/lib/scale";
import { getWorkspaceIntegrationStatus } from "@/lib/workspace-integration-status";
import {
  canCreateTasks,
  canUpdateTask,
  getTaskChartData,
  getTaskStats,
  listAssignableMembers,
  listDelegatedTasks,
} from "@/lib/tasks";

type TasksPageProps = {
  searchParams: Promise<{
    status?: string;
    assignee?: string;
    overdue?: string;
    doneToday?: string;
    page?: string;
    all?: string;
  }>;
};

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const user = await requireSession(undefined, { module: "TASKS" });
  const params = await searchParams;
  const page = taskPageFromSearchParam(params.page);

  const filter = {
    status:
      params.status && params.status !== "ALL"
        ? (params.status as TaskStatus)
        : undefined,
    assigneeUserId: params.assignee || undefined,
    overdueOnly: params.overdue === "1",
    completedTodayOnly: params.doneToday === "1",
    includeCompleted: params.status === "COMPLETED" || params.all === "1",
  };

  const taskPage = await listDelegatedTasks(user, filter, { page });
  const tasks = taskPage.items.map((task) => {
    const open = task.requests[0];
    return {
      ...task,
      canAct: canUpdateTask(user, task),
      canManage: canCreateTasks(user.role),
      isAssignee: task.assigneeUserId === user.id,
      openRequest: open
        ? {
            id: open.id,
            type: open.type,
            label:
              open.type === "REVISION"
                ? "Revision requested"
                : open.type === "EXTENSION"
                  ? "Extension requested"
                  : "Help requested",
            message: open.message,
            proposedDueAt: open.proposedDueAt,
          }
        : null,
    };
  });
  const [stats, chartData, members, spreadsheetId, integrationStatus] =
    await Promise.all([
    getTaskStats(user),
    getTaskChartData(user),
    canCreateTasks(user.role)
      ? listAssignableMembers(user.organizationId)
      : Promise.resolve([]),
    getSpreadsheetIdForOrganization(user.organizationId),
    getWorkspaceIntegrationStatus(user.organizationId),
  ]);
  const sheetsConnection = getGoogleSheetsConnectionStatus(spreadsheetId);

  const showCreate = canCreateTasks(user.role);
  const showAssigneeFilter =
    hasMinimumRole(user.role, "MANAGER") || user.role === "VIEWER";
  const filterMembers = members.map((member) => ({
    id: member.id,
    name: member.name,
  }));

  const filterParams = {
    status: params.status,
    assignee: params.assignee,
    overdue: params.overdue,
    doneToday: params.doneToday,
    all: params.all,
  };
  const quickFilterActive = hasQuickTaskFilter(filterParams);
  const activeFilterLabel = taskFilterLabel(filterParams);

  return (
    <div className="saas-page ws-tasks-page">
      <PageHeader title="Tasks" />

      <Suspense fallback={null}>
        <TaskFeedbackToast />
      </Suspense>

      {showCreate &&
      (!integrationStatus.whatsappConfigured ||
        !integrationStatus.emailConfigured) ? (
        <TaskIntegrationBanner status={integrationStatus} />
      ) : null}

      <section aria-label="Task overview" className="ws-task-overview">
        {!quickFilterActive ? (
          <div className="ws-task-overview-top">
            <TaskChartsPanel charts={chartData} />
            <aside className="ws-task-overview-side">
              <Suspense fallback={null}>
                <TaskFilters
                  current={{
                    status: params.status,
                    assignee: params.assignee,
                    overdue: params.overdue,
                    doneToday: params.doneToday,
                  }}
                  members={filterMembers}
                  showAssigneeFilter={showAssigneeFilter}
                />
              </Suspense>
              <div className="ws-task-overview-side-actions">
                <TaskExportBar
                  compact
                  sheetsReady={sheetsConnection.ready}
                  spreadsheetUrl={sheetsConnection.spreadsheetUrl}
                />
                {showCreate ? (
                  <Suspense fallback={null}>
                    <NewTaskTrigger />
                  </Suspense>
                ) : null}
              </div>
            </aside>
          </div>
        ) : null}
        <Suspense fallback={<div className="ws-task-stats is-loading" />}>
          <TaskStatsBar stats={stats} />
        </Suspense>
      </section>

      <Suspense fallback={<div className="ws-tasks-controls is-loading" />}>
        <TasksActionBar
          current={{
            status: params.status,
            assignee: params.assignee,
            overdue: params.overdue,
            doneToday: params.doneToday,
          }}
          filterMembers={filterMembers}
          filtersInOverview={!quickFilterActive}
          integrationStatus={integrationStatus}
          members={members}
          showAssigneeFilter={showAssigneeFilter}
          showCreate={showCreate}
        />
      </Suspense>

      <section className="ws-task-queue" id="execution-queue">
        <div className="ws-queue-head">
          <div>
            <h2 className="ws-queue-title">
              {activeFilterLabel ? `${activeFilterLabel} tasks` : "All Tasks"}
            </h2>
            <p className="ws-queue-sub">
              {taskPage.total} task{taskPage.total === 1 ? "" : "s"}
              {activeFilterLabel ? ` in ${activeFilterLabel.toLowerCase()}` : ""}
              {taskPage.totalPages > 1
                ? ` · page ${page} of ${taskPage.totalPages}`
                : ""}
            </p>
          </div>
        </div>
        <TaskTable
          members={members}
          tasks={tasks}
          whatsappConfigured={integrationStatus.whatsappConfigured}
        />
        <TaskPagination
          page={page}
          searchParams={filterParams}
          total={taskPage.total}
          totalPages={taskPage.totalPages}
        />
      </section>

    </div>
  );
}
