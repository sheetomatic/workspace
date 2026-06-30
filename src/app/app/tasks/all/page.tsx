import { Suspense } from "react";
import Link from "next/link";
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
  listAssignableMembers,
  listDelegatedTasks,
} from "@/lib/tasks";
import { getWorkspaceIntegrationStatus } from "@/lib/workspace-integration-status";
import {
  buildTaskVerifierIndex,
  canVerifyTask,
} from "@/lib/task-verification";

async function mapTasks(
  user: Awaited<ReturnType<typeof requireSession>>,
  items: Awaited<ReturnType<typeof listDelegatedTasks>>["items"],
) {
  const verifierByAssignee = await buildTaskVerifierIndex(
    user.organizationId,
    [...new Set(items.map((task) => task.assigneeUserId))],
  );

  return items.map((task) => {
    const open = task.requests[0];
    const checklistDone =
      task.status === "AWAITING_VERIFICATION" ||
      task.status === "COMPLETED" ||
      task.attachments.length > 0
        ? 1
        : 0;

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
      misScore: taskMisScore({
        status: task.status,
        dueAt: task.dueAt,
        completedAt: task.completedAt,
      }),
      checklistScore: checklistMisScore(checklistDone, 1),
    };
  });
}

export default async function EaAllPage() {
  const user = await requireSession(undefined, { module: "TASKS" });
  const isManager = canCreateTasks(user.role);
  const integrationStatus = await getWorkspaceIntegrationStatus(user.organizationId);

  const taskPage = await listDelegatedTasks(
    user,
    isManager ? { includeCompleted: false } : { assigneeUserId: user.id, includeCompleted: false },
    { page: 1, pageSize: 100 },
  );
  const members = isManager
    ? await listAssignableMembers(user.organizationId)
    : [];
  const tasks = await mapTasks(user, taskPage.items);

  return (
    <div className="saas-page ws-tasks-page ws-tasks-sf">
      <TaskPageToolbar
        title="EA — All"
        description={
          isManager
            ? "All active delegated tasks across the team."
            : "Every active task assigned to you."
        }
        actions={
          isManager ? (
            <Link href="/app/tasks" className="btn-secondary btn-sm">
              Dashboard
            </Link>
          ) : null
        }
      />
      <Suspense fallback={null}>
        <TaskFeedbackToast />
      </Suspense>

      <section className="ws-sf-list-view" aria-label="EA tasks">
        <header className="ws-sf-list-view-header">
          <div className="ws-sf-list-view-title">
            <h2>{isManager ? "Team queue" : "Your queue"}</h2>
            <span className="ws-sf-list-view-count">
              {tasks.length} item{tasks.length === 1 ? "" : "s"}
            </span>
          </div>
        </header>

        {tasks.length > 0 && !isManager ? (
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
          members={members}
          tasks={tasks}
          whatsappConfigured={integrationStatus.whatsappConfigured}
        />
      </section>
    </div>
  );
}
