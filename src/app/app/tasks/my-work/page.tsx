import { Suspense } from "react";
import { MisScoreBadge } from "@/components/saas/mis-score-badge";
import { TaskFeedbackToast } from "@/components/saas/task-feedback-toast";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { TaskTable } from "@/components/saas/task-table";
import { requireSession } from "@/lib/require-session";
import { checklistMisScore, taskMisScore } from "@/lib/mis/score";
import { canUpdateTask, listDelegatedTasks } from "@/lib/tasks";
import { getWorkspaceIntegrationStatus } from "@/lib/workspace-integration-status";

export default async function TasksMyWorkPage() {
  const user = await requireSession(undefined, { module: "TASKS" });
  const integrationStatus = await getWorkspaceIntegrationStatus(user.organizationId);

  const taskPage = await listDelegatedTasks(
    user,
    { assigneeUserId: user.id, includeCompleted: false },
    { page: 1, pageSize: 50 },
  );

  const tasks = taskPage.items.map((task) => {
    const open = task.requests[0];
    const checklistDone =
      task.attachments.length > 0 || task.status === "COMPLETED" ? 1 : 0;

    return {
      ...task,
      canAct: canUpdateTask(user, task),
      canManage: false,
      isAssignee: true,
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
      misScore: taskMisScore({
        status: task.status,
        dueAt: task.dueAt,
        completedAt: task.completedAt,
      }),
      checklistScore: checklistMisScore(checklistDone, 1),
    };
  });

  const avgScore =
    tasks.length > 0
      ? Math.round(tasks.reduce((sum, t) => sum + t.misScore.score, 0) / tasks.length)
      : 100;

  return (
    <div className="saas-page ws-tasks-page ws-tasks-sf">
      <TaskPageToolbar
        title="My work"
        description="Tasks assigned to you. Complete proof checklist items to keep your MIS score high."
      />

      <Suspense fallback={null}>
        <TaskFeedbackToast />
      </Suspense>

      <div className="ws-sf-metrics ws-fms-metrics">
        <div className="ws-sf-metric-tile">
          <span>Your tasks</span>
          <strong>{tasks.length}</strong>
          <span className="ws-stat-card-hint">Active queue</span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>Your MIS score</span>
          <strong>{avgScore}</strong>
          <span className="ws-stat-card-hint">Queue average</span>
        </div>
      </div>

      <section className="ws-sf-list-view" aria-label="Your tasks">
        <header className="ws-sf-list-view-header">
          <div className="ws-sf-list-view-title">
            <h2>Assigned to you</h2>
            <span className="ws-sf-list-view-count">
              {tasks.length} item{tasks.length === 1 ? "" : "s"}
            </span>
          </div>
        </header>

        {tasks.length > 0 ? (
          <div className="ws-mis-task-score-strip">
            {tasks.slice(0, 5).map((task) => (
              <div key={task.id} className="ws-mis-task-score-chip">
                <span className="ws-mis-task-score-title">{task.title}</span>
                <MisScoreBadge score={task.misScore} compact showLabel={false} />
                <MisScoreBadge score={task.checklistScore} compact showLabel={false} />
              </div>
            ))}
          </div>
        ) : null}

        <TaskTable
          members={[]}
          tasks={tasks}
          whatsappConfigured={integrationStatus.whatsappConfigured}
        />
      </section>
    </div>
  );
}
