import Link from "next/link";
import { redirect } from "next/navigation";
import { TaskCreateForm } from "@/components/saas/task-create-form";
import { TaskIntegrationBanner } from "@/components/saas/task-integration-banner";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { requireSession } from "@/lib/require-session";
import { canCreateTasks, listAssignableMembers } from "@/lib/tasks";
import { getWorkspaceIntegrationStatus } from "@/lib/workspace-integration-status";

export default async function CreateTaskPage() {
  const user = await requireSession(undefined, { module: "TASKS" });

  if (!canCreateTasks(user.role)) {
    redirect("/app/tasks/today");
  }

  const [members, integrationStatus] = await Promise.all([
    listAssignableMembers(user.organizationId),
    getWorkspaceIntegrationStatus(user.organizationId),
  ]);

  return (
    <div className="saas-page ws-tasks-page ws-tasks-sf ws-task-create-page">
      <TaskPageToolbar
        title="Create task"
        description="Create one task or assign the same task to multiple people."
        actions={
          <Link href="/app/tasks" className="btn-secondary btn-sm">
            Back to team board
          </Link>
        }
      />

      {!integrationStatus.whatsappConfigured || !integrationStatus.emailConfigured ? (
        <TaskIntegrationBanner status={integrationStatus} />
      ) : null}

      <section className="ws-sf-card ws-task-create-card">
        <TaskCreateForm
          emailConfigured={integrationStatus.emailConfigured}
          members={members}
          whatsappConfigured={integrationStatus.whatsappConfigured}
        />
      </section>
    </div>
  );
}
