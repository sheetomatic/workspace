import { HrChecklistBoard } from "@/components/saas/hr-checklist-board";
import {
  getHrFocusGroup,
  type HrFocusId,
} from "@/lib/checklists/hr-checklist-catalog";
import { listChecklistTemplatesByTeam } from "@/lib/checklists/queries";
import {
  checklistPcDoerOptions,
  filterChecklistPcRows,
  listChecklistPcRows,
  resolveChecklistListFilters,
} from "@/lib/checklists/pc-rows";
import { canCreateTasks, listAssignableMembers } from "@/lib/tasks";
import { requireSession } from "@/lib/require-session";

type PageProps = {
  searchParams: Promise<{
    tab?: string;
    due?: string;
    date?: string;
    doer?: string;
    dept?: string;
  }>;
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
  const filters = resolveChecklistListFilters(params, "HR");

  const [allRows, templates, assignable] = await Promise.all([
    listChecklistPcRows(user.organizationId, user.id),
    listChecklistTemplatesByTeam(user.organizationId, "HR"),
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
    <HrChecklistBoard
      activeTab={activeTab}
      canConfigure={canConfigure}
      doers={checklistPcDoerOptions(allRows)}
      filters={filters}
      installedTitles={templates.map((template) => template.title)}
      members={members}
      rows={rows}
    />
  );
}
