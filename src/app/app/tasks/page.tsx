import { Suspense } from "react";
import type { TaskStatus } from "@prisma/client";
import { PageHeader } from "@/components/saas/page-header";
import { TaskFeedbackToast } from "@/components/saas/task-feedback-toast";
import { TasksActionBar } from "@/components/saas/tasks-action-bar";
import { TaskList } from "@/components/saas/task-list";
import { TaskPagination } from "@/components/saas/task-pagination";
import { requireSession } from "@/lib/require-session";
import { taskPageFromSearchParam } from "@/lib/scale";
import {
  canCreateTasks,
  canUpdateTask,
  getTaskStats,
  listAssignableMembers,
  listDelegatedTasks,
} from "@/lib/tasks";

type TasksPageProps = {
  searchParams: Promise<{
    status?: string;
    assignee?: string;
    overdue?: string;
    page?: string;
    all?: string;
  }>;
};

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const user = await requireSession();
  const params = await searchParams;
  const page = taskPageFromSearchParam(params.page);

  const filter = {
    status:
      params.status && params.status !== "ALL"
        ? (params.status as TaskStatus)
        : undefined,
    assigneeUserId: params.assignee || undefined,
    overdueOnly: params.overdue === "1",
    includeCompleted: params.status === "COMPLETED" || params.all === "1",
  };

  const taskPage = await listDelegatedTasks(user, filter, { page });
  const tasks = taskPage.items.map((task) => ({
    ...task,
    canAct: canUpdateTask(user, task),
    canManage: canCreateTasks(user.role),
  }));
  const [stats, members] = await Promise.all([
    getTaskStats(user),
    canCreateTasks(user.role)
      ? listAssignableMembers(user.organizationId)
      : Promise.resolve([]),
  ]);

  const showCreate = canCreateTasks(user.role);
  const filterMembers = members.map((member) => ({
    id: member.id,
    name: member.name,
  }));

  return (
    <div className="saas-page ws-tasks-page">
      <PageHeader
        title="Tasks"
        description="Delegate, track, and complete work with clear owners, due dates, and reminders."
      />

      <Suspense fallback={null}>
        <TaskFeedbackToast />
      </Suspense>

      <div className="ws-task-stats">
        <div className="ws-stat-card ws-stat-pending">
          <span>Pending</span>
          <strong>{stats.pending}</strong>
        </div>
        <div className="ws-stat-card ws-stat-progress">
          <span>In progress</span>
          <strong>{stats.inProgress}</strong>
        </div>
        <div className="ws-stat-card ws-stat-done">
          <span>Done today</span>
          <strong>{stats.completedToday}</strong>
        </div>
        <div className="ws-stat-card ws-stat-overdue">
          <span>Overdue</span>
          <strong>{stats.overdue}</strong>
        </div>
      </div>

      <Suspense fallback={<div className="ws-tasks-controls is-loading" />}>
        <TasksActionBar
          current={{
            status: params.status,
            assignee: params.assignee,
            overdue: params.overdue,
          }}
          filterMembers={filterMembers}
          members={members}
          showCreate={showCreate}
        />
      </Suspense>

      <section className="ws-task-queue" id="execution-queue">
        <div className="ws-queue-head">
          <div>
            <h2 className="ws-queue-title">Task board</h2>
            <p className="ws-queue-sub">
              {taskPage.total} task{taskPage.total === 1 ? "" : "s"} total
              {taskPage.totalPages > 1
                ? ` · showing ${tasks.length} on page ${page}`
                : ""}
            </p>
          </div>
        </div>
        <TaskList members={members} tasks={tasks} />
        <TaskPagination
          page={page}
          searchParams={{
            status: params.status,
            assignee: params.assignee,
            overdue: params.overdue,
            all: params.all,
          }}
          total={taskPage.total}
          totalPages={taskPage.totalPages}
        />
      </section>
    </div>
  );
}
