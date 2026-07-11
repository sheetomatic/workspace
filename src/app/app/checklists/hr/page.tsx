import { HrChecklistBoard } from "@/components/saas/hr-checklist-board";
import {
  getHrFocusGroup,
  type HrFocusId,
} from "@/lib/checklists/hr-checklist-catalog";
import { listChecklistTemplatesByTeam } from "@/lib/checklists/queries";
import { listMyChecklistPcWork, listOrgPcMonitor } from "@/lib/checklists/pc-work";
import { canCreateTasks, listAssignableMembers } from "@/lib/tasks";
import { requireSession } from "@/lib/require-session";

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

function parseHrTab(raw: string | undefined): HrFocusId | null {
  if (!raw) return null;
  return getHrFocusGroup(raw) ? (raw as HrFocusId) : null;
}

export default async function HrChecklistPage({ searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "TASKS" });
  const params = await searchParams;
  const activeTab = parseHrTab(params.tab?.trim());
  const canConfigure = canCreateTasks(user.role);

  const [templates, monitor, myRuns, assignable] = await Promise.all([
    listChecklistTemplatesByTeam(user.organizationId, "HR"),
    listOrgPcMonitor(user.organizationId),
    listMyChecklistPcWork(user.organizationId, user.id),
    canConfigure
      ? listAssignableMembers(user.organizationId)
      : Promise.resolve([]),
  ]);

  const openRuns = monitor.checklists.filter((row) => row.subtitle === "HR");
  const myTeamRuns = myRuns.filter((row) => row.template.team === "HR");
  const members = assignable.map((member) => ({
    id: member.id,
    label: member.name,
  }));

  return (
    <HrChecklistBoard
      activeTab={activeTab}
      canConfigure={canConfigure}
      members={members}
      myRuns={myTeamRuns}
      openRuns={openRuns}
      templates={templates}
    />
  );
}
