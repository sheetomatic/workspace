import { ChecklistTaskRows } from "@/components/saas/checklist-task-rows";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { canAdminChecklists } from "@/lib/checklists/access";
import { listOpenChecklistTasks } from "@/lib/checklists/queries";
import { listAssignableMembers } from "@/lib/tasks";
import { requireSession } from "@/lib/require-session";
import { BCI_OPS_MODULES } from "@/lib/workspace-modules";

export default async function ChecklistMyTasksPage() {
  const user = await requireSession(undefined, { anyModules: BCI_OPS_MODULES });
  const [tasks, assignable] = await Promise.all([
    listOpenChecklistTasks(user.organizationId),
    listAssignableMembers(user.organizationId),
  ]);
  const mine = tasks.filter((task) => task.assigneeUserId === user.id);

  return (
    <div className="saas-page ws-checklists-page ws-tasks-sf">
      <TaskPageToolbar
        title="My checklists"
        description="Your open checklist tasks, from any department."
      />
      <section className="ws-sf-list-view" aria-label="My checklist tasks">
        <ChecklistTaskRows
          currentUserId={user.id}
          isAdmin={canAdminChecklists(user)}
          members={assignable.map((member) => ({
            id: member.id,
            name: member.name,
            email: member.email,
          }))}
          showDepartment
          tasks={mine}
        />
      </section>
    </div>
  );
}
