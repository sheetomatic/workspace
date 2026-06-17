import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { TaskStatus } from "@prisma/client";
import { TaskAssigneeDashboard } from "@/components/saas/task-assignee-dashboard";
import { TaskChartsPanel } from "@/components/saas/task-charts-panel";
import { TaskExportBar } from "@/components/saas/task-export-bar";
import { TaskFeedbackToast } from "@/components/saas/task-feedback-toast";
import { TaskIntegrationBanner } from "@/components/saas/task-integration-banner";
import { TaskFilters } from "@/components/saas/task-filters";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { TaskStatsBar } from "@/components/saas/task-stats-bar";
import { NewTaskTrigger } from "@/components/saas/tasks-action-bar";
import { TaskPagination } from "@/components/saas/task-pagination";
import { TaskTable } from "@/components/saas/task-table";
import {
  hasQuickTaskFilter,
  taskFilterLabel,
} from "@/lib/task-filter-label";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { taskPageFromSearchParam } from "@/lib/scale";
import { getTaskDueUrgency } from "@/lib/task-due-urgency";
import { getWorkspaceIntegrationStatus } from "@/lib/workspace-integration-status";
import {
  canCreateTasks,
  canUpdateTask,
  formatTaskDueLabel,
  getTaskAssigneeWorkload,
  getTaskChartData,
  getTaskStats,
  listAssignableMembers,
  listDelegatedTasks,
} from "@/lib/tasks";
import {
  buildTaskVerifierIndex,
  canVerifyTask,
} from "@/lib/task-verification";

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

  if (!canCreateTasks(user.role) && user.role !== "VIEWER") {
    redirect("/app/tasks/my-work");
  }

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
  const verifierByAssignee = await buildTaskVerifierIndex(
    user.organizationId,
    [...new Set(taskPage.items.map((task) => task.assigneeUserId))],
  );
  const tasks = taskPage.items.map((task) => {
    const open = task.requests[0];
    return {
      ...task,
      canAct: canUpdateTask(user, task),
      canManage: canCreateTasks(user.role),
      canVerify: canVerifyTask(
        user,
        {
          assigneeUserId: task.assigneeUserId,
          createdById: task.createdById,
          status: task.status,
        },
        verifierByAssignee,
      ),
      isAssignee: task.assigneeUserId === user.id,
      dueLabel: formatTaskDueLabel(task.dueAt, task.status),
      urgency: getTaskDueUrgency({
        dueAt: task.dueAt,
        status: task.status,
        completedAt: task.completedAt,
      }),
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
  const showCreate = canCreateTasks(user.role);
  const showAssigneeFilter =
    hasMinimumRole(user.role, "MANAGER") || user.role === "VIEWER";

  const [stats, chartData, members, assigneeWorkload, integrationStatus] =
    await Promise.all([
    getTaskStats(user),
    getTaskChartData(user),
    canCreateTasks(user.role)
      ? listAssignableMembers(user.organizationId)
      : Promise.resolve([]),
    showAssigneeFilter
      ? getTaskAssigneeWorkload(user)
      : Promise.resolve([]),
    getWorkspaceIntegrationStatus(user.organizationId),
  ]);
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
  const listTitle = activeFilterLabel ? `${activeFilterLabel} Tasks` : "All Tasks";

  return (
    <div className="saas-page ws-tasks-page ws-tasks-sf">
      <TaskPageToolbar
        title="Team board"
        description="All team tasks, workload, and filters."
        actions={
          <>
            <TaskExportBar
              compact
              sheetsReady={false}
              spreadsheetUrl={null}
            />
            {showCreate ? (
              <Suspense fallback={null}>
                <NewTaskTrigger className="btn-cta btn-primary ws-sf-btn-primary ws-new-task-trigger" />
              </Suspense>
            ) : null}
          </>
        }
      />

      <Suspense fallback={null}>
        <TaskFeedbackToast />
      </Suspense>

      {showCreate &&
      (!integrationStatus.whatsappConfigured ||
        !integrationStatus.emailConfigured) ? (
        <TaskIntegrationBanner status={integrationStatus} />
      ) : null}

      <Suspense fallback={<div className="ws-sf-metrics is-loading" />}>
        <TaskStatsBar stats={stats} />
      </Suspense>

      <Suspense fallback={null}>
        <TaskAssigneeDashboard rows={assigneeWorkload} showTeam={showAssigneeFilter} />
      </Suspense>

      {!quickFilterActive && chartData.statusBreakdown.length > 0 ? (
        <div className="ws-sf-chart-compact">
          <TaskChartsPanel charts={chartData} />
        </div>
      ) : null}

      <section className="ws-sf-list-view" id="execution-queue" aria-label="Task list">
        <header className="ws-sf-list-view-header">
          <div className="ws-sf-list-view-title">
            <h2>{listTitle}</h2>
            <span className="ws-sf-list-view-count">
              {taskPage.total} item{taskPage.total === 1 ? "" : "s"}
            </span>
          </div>
          <Suspense fallback={null}>
            <TaskFilters
              current={{
                status: params.status,
                assignee: params.assignee,
                overdue: params.overdue,
                doneToday: params.doneToday,
              }}
              inListHeader
              members={filterMembers}
              showAssigneeFilter={showAssigneeFilter}
            />
          </Suspense>
        </header>

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
