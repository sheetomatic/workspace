import { TeamChecklistBoard } from "@/components/saas/team-checklist-board";
import { getTeamChecklistProfile } from "@/lib/checklists/team-checklist-profiles";
import {
  listChecklistTemplatesByTeam,
  listTeamChecklistTasks,
} from "@/lib/checklists/queries";
import { canAdminChecklists } from "@/lib/checklists/access";
import { canCreateTasks, listAssignableMembers } from "@/lib/tasks";
import { requireSession } from "@/lib/require-session";
import { BCI_OPS_MODULES } from "@/lib/workspace-modules";

export default async function AccountsChecklistPage() {
  const user = await requireSession(undefined, { anyModules: BCI_OPS_MODULES });
  const profile = getTeamChecklistProfile("ACCOUNTS")!;
  const isAdmin = canAdminChecklists(user);

  const [templates, tasks, assignable] = await Promise.all([
    listChecklistTemplatesByTeam(user.organizationId, "ACCOUNTS"),
    listTeamChecklistTasks(user.organizationId, "ACCOUNTS"),
    listAssignableMembers(user.organizationId),
  ]);

  return (
    <TeamChecklistBoard
      canConfigure={canCreateTasks(user.role)}
      currentUserId={user.id}
      isAdmin={isAdmin}
      members={assignable.map((member) => ({
        id: member.id,
        name: member.name,
        email: member.email,
      }))}
      profile={profile}
      tasks={tasks}
      team="ACCOUNTS"
      templates={templates}
    />
  );
}
