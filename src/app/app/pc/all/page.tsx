import Link from "next/link";
import { redirect } from "next/navigation";
import { PcMonitorBoard, PcMonitorMetrics } from "@/components/saas/pc-monitor-board";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import {
  listOrgPcFollowupsMonitor,
} from "@/lib/checklists/pc-work";
import { canCreateTasks, listAssignableMembers } from "@/lib/tasks";
import { requireSession } from "@/lib/require-session";
import { hasWorkspaceModule } from "@/lib/workspace-modules";

export default async function PcAllPage() {
  const user = await requireSession(undefined, { module: "TASKS" });

  if (!canCreateTasks(user.role)) {
    redirect("/app/pc/today");
  }

  const fmsEnabled = hasWorkspaceModule(user, "FMS");
  const monitor = await listOrgPcFollowupsMonitor(user.organizationId);
  const members = await listAssignableMembers(user.organizationId);
  const overdueCount =
    monitor.eaTasks.filter((row) => row.overdue).length +
    (fmsEnabled ? monitor.fmsSteps.filter((row) => row.overdue).length : 0);

  return (
    <div className="saas-page ws-pc-page ws-tasks-sf ws-pc-monitor-page">
      <TaskPageToolbar
        title="PC — All"
        description="Chase EA tasks and FMS stops across the team. Checklist discipline is under Check List."
        actions={
          <Link href="/app/tasks/create" className="btn-primary btn-sm ws-sf-btn-primary">
            Assign task
          </Link>
        }
      />

      <PcMonitorMetrics
        eaCount={monitor.eaTasks.length}
        fmsCount={fmsEnabled ? monitor.fmsSteps.length : 0}
        fmsEnabled={fmsEnabled}
        overdueCount={overdueCount}
      />

      <PcMonitorBoard
        eaTasks={monitor.eaTasks}
        fmsEnabled={fmsEnabled}
        fmsSteps={fmsEnabled ? monitor.fmsSteps : []}
        members={members}
      />
    </div>
  );
}
