import { TeamChecklistBoard } from "@/components/saas/team-checklist-board";
import { getTeamChecklistProfile } from "@/lib/checklists/team-checklist-profiles";
import {
  listChecklistTemplatesByTeam,
} from "@/lib/checklists/queries";
import { listMyChecklistPcWork, listOrgPcMonitor } from "@/lib/checklists/pc-work";
import { canCreateTasks } from "@/lib/tasks";
import { requireSession } from "@/lib/require-session";

export default async function AccountsChecklistPage() {
  const user = await requireSession(undefined, { module: "TASKS" });
  const profile = getTeamChecklistProfile("ACCOUNTS")!;

  const [templates, monitor, myRuns] = await Promise.all([
    listChecklistTemplatesByTeam(user.organizationId, "ACCOUNTS"),
    listOrgPcMonitor(user.organizationId),
    listMyChecklistPcWork(user.organizationId, user.id),
  ]);

  const openRuns = monitor.checklists.filter((row) => row.subtitle === "ACCOUNTS");
  const myTeamRuns = myRuns.filter((row) => row.template.team === "ACCOUNTS");

  return (
    <TeamChecklistBoard
      canConfigure={canCreateTasks(user.role)}
      myRuns={myTeamRuns}
      openRuns={openRuns}
      profile={profile}
      team="ACCOUNTS"
      templates={templates}
    />
  );
}
