import { PcFollowupsBoard } from "@/components/saas/pc-followups-board";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { listMyPcFollowups } from "@/lib/checklists/pc-work";
import { requireSession } from "@/lib/require-session";

export default async function PcTodayPage() {
  const user = await requireSession(undefined, { module: "TASKS" });
  const { eaTasks, fmsSteps } = await listMyPcFollowups(
    user.organizationId,
    user.id,
    "today",
  );

  return (
    <div className="saas-page ws-pc-page ws-tasks-sf">
      <TaskPageToolbar
        title="PC — Today"
        description="EA task and FMS follow-ups due today or overdue. Checklist SOPs are under Check List."
      />
      <PcFollowupsBoard eaTasks={eaTasks} fmsSteps={fmsSteps} scopeLabel="Today" />
    </div>
  );
}
