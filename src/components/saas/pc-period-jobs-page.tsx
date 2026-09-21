import { PcDoerJobsBoard } from "@/components/saas/pc-doer-jobs-board";
import { PcMonitorMetrics } from "@/components/saas/pc-monitor-board";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import {
  enrichPcChaseStatus,
  listMyPcFollowups,
  listOrgPcFollowupsMonitor,
} from "@/lib/checklists/pc-work";
import type { PcPeriod } from "@/lib/checklists/pc-period";
import { canAdminChecklists } from "@/lib/checklists/access";
import { canCreateTasks, listAssignableMembers } from "@/lib/tasks";
import { requireSession } from "@/lib/require-session";
import { BCI_OPS_MODULES, hasWorkspaceModule } from "@/lib/workspace-modules";

const COPY: Record<
  Exclude<PcPeriod, "all">,
  { title: string; description: string; scope: string }
> = {
  today: {
    title: "PC jobs — Today",
    description:
      "Doer-wise Check Lists, Task Delegations, and FMS stops due today or overdue. Follow up, then mark PC done when your chase is complete.",
    scope: "Today",
  },
  week: {
    title: "PC jobs — This week",
    description:
      "Monday–Sunday queue. Chase each doer until Planned/Actual is closed. PC job is follow-up, not doing their work.",
    scope: "This week",
  },
  month: {
    title: "PC jobs — This month",
    description:
      "Month-wise PC monitor: pending, overdue, and delayed work by doer — same rhythm as weekly EM / MIS.",
    scope: "This month",
  },
};

export async function PcPeriodJobsPage({ period }: { period: Exclude<PcPeriod, "all"> }) {
  const user = await requireSession(undefined, { anyModules: BCI_OPS_MODULES });
  const manager = canCreateTasks(user.role);
  const isAdmin = canAdminChecklists(user);
  const fmsEnabled = hasWorkspaceModule(user, "FMS");
  const copy = COPY[period];

  const raw = manager
    ? await listOrgPcFollowupsMonitor(user.organizationId, period)
    : await listMyPcFollowups(user.organizationId, user.id, period);

  const checklists = raw.checklists ?? [];
  const eaTasks = raw.eaTasks;
  const fmsSteps = fmsEnabled ? raw.fmsSteps : [];
  const items = await enrichPcChaseStatus(user.organizationId, [
    ...checklists,
    ...eaTasks,
    ...fmsSteps,
  ]);
  const members = await listAssignableMembers(user.organizationId);
  const overdueCount = items.filter((row) => row.overdue).length;

  return (
    <div className="saas-page ws-pc-page ws-tasks-sf ws-pc-monitor-page">
      <TaskPageToolbar title={copy.title} description={copy.description} />
      <PcMonitorMetrics
        eaCount={eaTasks.length}
        checklistCount={checklists.length}
        fmsCount={fmsSteps.length}
        fmsEnabled={fmsEnabled}
        overdueCount={overdueCount}
      />
      <PcDoerJobsBoard
        currentUserId={user.id}
        isAdmin={isAdmin}
        items={items}
        members={members}
        scopeLabel={copy.scope}
        period={period}
      />
    </div>
  );
}
