import { TeamChecklistBoard } from "@/components/saas/team-checklist-board";
import { getTeamChecklistProfile } from "@/lib/checklists/team-checklist-profiles";
import {
  listChecklistTemplatesByTeam,
} from "@/lib/checklists/queries";
import { listMyChecklistPcWork, listOrgPcMonitor } from "@/lib/checklists/pc-work";
import { canCreateTasks } from "@/lib/tasks";
import { requireSession } from "@/lib/require-session";
import { BCI_OPS_MODULES } from "@/lib/workspace-modules";

export default async function MaintenanceChecklistPage() {
  const user = await requireSession(undefined, { anyModules: BCI_OPS_MODULES });
  const profile = getTeamChecklistProfile("MAINTENANCE")!;

  const [templates, monitor, myRuns] = await Promise.all([
    listChecklistTemplatesByTeam(user.organizationId, "MAINTENANCE"),
    listOrgPcMonitor(user.organizationId),
    listMyChecklistPcWork(user.organizationId, user.id),
  ]);

  const openRuns = monitor.checklists.filter((row) => row.subtitle === "MAINTENANCE");
  const myTeamRuns = myRuns.filter((row) => row.template.team === "MAINTENANCE");

  return (
    <TeamChecklistBoard
      canConfigure={canCreateTasks(user.role)}
      myRuns={myTeamRuns}
      openRuns={openRuns}
      profile={profile}
      team="MAINTENANCE"
      templates={templates}
    />
  );
}
