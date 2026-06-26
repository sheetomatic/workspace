import Link from "next/link";
import { PcMyTasksBoard } from "@/components/saas/pc-my-tasks-board";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { listMyPcWork } from "@/lib/checklists/pc-work";
import { requireSession } from "@/lib/require-session";
import { hasWorkspaceModule } from "@/lib/workspace-modules";

export default async function PcMyTasksPage() {
  const user = await requireSession(undefined, { module: "TASKS" });
  const fmsEnabled = hasWorkspaceModule(user, "FMS");

  const work = await listMyPcWork(user.organizationId, user.id);

  return (
    <div className="saas-page ws-checklists-page ws-tasks-sf ws-pc-my-tasks-page">
      <TaskPageToolbar
        title="My PC tasks"
        description="Complete checklist items here. EA and FMS open in their modules."
        actions={
          <Link href="/app/checklists" className="btn-secondary btn-sm">
            Monitor
          </Link>
        }
      />
      <PcMyTasksBoard
        checklists={work.checklists}
        eaTasks={work.eaTasks}
        fmsSteps={fmsEnabled ? work.fmsSteps : []}
      />
    </div>
  );
}
