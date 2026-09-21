import { HrChecklistBoard } from "@/components/saas/hr-checklist-board";
import {
  getHrFocusGroup,
  type HrFocusId,
} from "@/lib/checklists/hr-checklist-catalog";
import {
  listChecklistTemplatesByTeam,
  listTeamChecklistTasks,
} from "@/lib/checklists/queries";
import { listOrgPcMonitor } from "@/lib/checklists/pc-work";
import { canAdminChecklists } from "@/lib/checklists/access";
import { canCreateTasks, listAssignableMembers } from "@/lib/tasks";
import { requireSession } from "@/lib/require-session";
import { BCI_OPS_MODULES } from "@/lib/workspace-modules";

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

function parseHrTab(raw: string | undefined): HrFocusId | null {
  if (!raw) return null;
  return getHrFocusGroup(raw) ? (raw as HrFocusId) : null;
}

export default async function HrChecklistPage({ searchParams }: PageProps) {
  const user = await requireSession(undefined, { anyModules: BCI_OPS_MODULES });
  const params = await searchParams;
  const activeTab = parseHrTab(params.tab?.trim());
  const canConfigure = canCreateTasks(user.role);
  const isAdmin = canAdminChecklists(user);

  const [templates, monitor, tasks, assignable] = await Promise.all([
    listChecklistTemplatesByTeam(user.organizationId, "HR"),
    listOrgPcMonitor(user.organizationId),
    listTeamChecklistTasks(user.organizationId, "HR"),
    listAssignableMembers(user.organizationId),
  ]);

  const openRuns = monitor.checklists.filter((row) => row.subtitle === "HR");
  const members = assignable.map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email,
  }));
  const deployMembers = assignable.map((member) => ({
    id: member.id,
    label: member.name,
  }));

  return (
    <HrChecklistBoard
      activeTab={activeTab}
      canConfigure={canConfigure}
      currentUserId={user.id}
      deployMembers={deployMembers}
      isAdmin={isAdmin}
      members={members}
      openRuns={openRuns}
      tasks={tasks}
      templates={templates}
    />
  );
}
