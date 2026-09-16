import { TeamChecklistBoard } from "@/components/saas/team-checklist-board";
import { getTeamChecklistProfile } from "@/lib/checklists/team-checklist-profiles";
import {
  checklistPcDoerOptions,
  filterChecklistPcRows,
  listChecklistPcRows,
  resolveChecklistListFilters,
} from "@/lib/checklists/pc-rows";
import { canCreateTasks, listAssignableMembers } from "@/lib/tasks";
import { requireSession } from "@/lib/require-session";

type PageProps = {
  searchParams: Promise<{ due?: string; date?: string; doer?: string; dept?: string }>;
};

export default async function AccountsChecklistPage({ searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "TASKS" });
  const profile = getTeamChecklistProfile("ACCOUNTS")!;
  const params = await searchParams;
  const canConfigure = canCreateTasks(user.role);
  const filters = resolveChecklistListFilters(params, "ACCOUNTS");

  const [allRows, assignable] = await Promise.all([
    listChecklistPcRows(user.organizationId, user.id),
    canConfigure
      ? listAssignableMembers(user.organizationId)
      : Promise.resolve([]),
  ]);

  const rows = filterChecklistPcRows(allRows, filters);
  const members = assignable.map((member) => ({
    id: member.id,
    label: member.name,
  }));

  return (
    <TeamChecklistBoard
      canConfigure={canConfigure}
      doers={checklistPcDoerOptions(allRows)}
      filters={filters}
      members={members}
      profile={profile}
      rows={rows}
      team="ACCOUNTS"
    />
  );
}
