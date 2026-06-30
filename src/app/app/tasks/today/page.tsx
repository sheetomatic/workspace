import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MisScoreBadge } from "@/components/saas/mis-score-badge";
import { TaskFeedbackToast } from "@/components/saas/task-feedback-toast";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { TaskTable } from "@/components/saas/task-table";
import { requireSession } from "@/lib/require-session";
import { checklistMisScore, taskMisScore } from "@/lib/mis/score";
import { getTaskDueUrgency } from "@/lib/task-due-urgency";
import {
  canCreateTasks,
  canUpdateTask,
  formatTaskDueLabel,
  listDelegatedTasks,
} from "@/lib/tasks";
import { getWorkspaceIntegrationStatus } from "@/lib/workspace-integration-status";
import {
  buildTaskVerifierIndex,
  canVerifyTask,
} from "@/lib/task-verification";

async function loadEaTasks(user: Awaited<ReturnType<typeof requireSession>>, scope: "today" | "all") {
  const taskPage = await listDelegatedTasks(
    user,
    { assigneeUserId: user.id, includeCompleted: false },
    { page: 1, pageSize: 100 },
  );

  const verifierByAssignee = await buildTaskVerifierIndex(
    user.organizationId,
    [...new Set(taskPage.items.map((task) => task.assigneeUserId))],
  );

  const mapped = taskPage.items.map((task) => {
    const open = task.requests[0];
    const checklistDone =
      task.status === "AWAITING_VERIFICATION" ||
      task.status === "COMPLETED" ||
      task.attachments.length > 0
        ? 1
        : 0;
    const urgency = getTaskDueUrgency({
      dueAt: task.dueAt,
      status: task.status,
      completedAt: task.completedAt,
    });

    return {
      ...task,
      canAct: canUpdateTask(user, task),
      canManage: false,
      canVerify: canVerifyTask(
        user,
        {
          assigneeUserId: task.assigneeUserId,
          createdById: task.createdById,
          status: task.status,
        },
        verifierByAssignee,
      ),
      isAssignee: true,
      dueLabel: formatTaskDueLabel(task.dueAt, task.status),
      urgency,
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

  if (scope === "today") {
    return mapped.filter(
      (task) => task.urgency === "due-overdue" || task.urgency === "due-today",
    );
  }

  return mapped;
}

function EaTaskList({
  tasks,
  whatsappConfigured,
}: {
  tasks: Awaited<ReturnType<typeof loadEaTasks>>;
  whatsappConfigured: boolean;
}) {
  return (
    <section className="ws-sf-list-view" aria-label="EA tasks">
      <header className="ws-sf-list-view-header">
        <div className="ws-sf-list-view-title">
          <h2>Your queue</h2>
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

      <TaskTable members={[]} tasks={tasks} whatsappConfigured={whatsappConfigured} />
    </section>
  );
}

export default async function EaTodayPage() {
  const user = await requireSession(undefined, { module: "TASKS" });
  const integrationStatus = await getWorkspaceIntegrationStatus(user.organizationId);
  const tasks = await loadEaTasks(user, "today");

  return (
    <div className="saas-page ws-tasks-page ws-tasks-sf">
      <TaskPageToolbar
        title="EA — Today"
        description="Delegated tasks due today or overdue. PC chases follow-up in the PC module."
      />
      <Suspense fallback={null}>
        <TaskFeedbackToast />
      </Suspense>
      <EaTaskList tasks={tasks} whatsappConfigured={integrationStatus.whatsappConfigured} />
    </div>
  );
}
