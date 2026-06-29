import Link from "next/link";
import { AccountsChecklistDeployPanel } from "@/components/saas/accounts-checklist-deploy";
import { AccountsChecklistGridBoard } from "@/components/saas/accounts-checklist-grid";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import {
  countAccountsTemplates,
  getAccountsChecklistGrid,
} from "@/lib/checklists/accounts-grid";
import { canCreateTasks } from "@/lib/tasks";
import { listWorkspaceMembers } from "@/lib/workspace";
import { requireSession } from "@/lib/require-session";

export default async function AccountsChecklistPage() {
  const user = await requireSession(undefined, { module: "TASKS" });
  const canManage = canCreateTasks(user.role);
  const [grid, templateCount, members] = await Promise.all([
    getAccountsChecklistGrid(user.organizationId).catch(() => ({
      monthLabel: new Date().toLocaleString("en-IN", {
        month: "long",
        year: "numeric",
      }),
      week1Label: "Week 1",
      week2Label: "Week 2",
      rows: [],
    })),
    countAccountsTemplates(user.organizationId).catch(() => 0),
    canManage ? listWorkspaceMembers(user.organizationId) : Promise.resolve([]),
  ]);

  const memberOptions = members.map((member) => ({
    id: member.user.id,
    label: member.user.name ?? member.user.email,
  }));
  if (
    canManage &&
    !memberOptions.some((member) => member.id === user.id)
  ) {
    memberOptions.unshift({
      id: user.id,
      label: user.name ?? user.email,
    });
  }

  return (
    <div className="saas-page ws-checklists-page ws-accounts-checklist-page">
      <TaskPageToolbar
        title="Accounts Checklist"
        description="Classic M/Q/Y/HY grid with accountability, last date, and fortnight tracking."
        actions={
          <Link href="/app/checklists/setup" className="btn-secondary btn-sm">
            Setup
          </Link>
        }
      />

      {canManage ? (
        <AccountsChecklistDeployPanel
          members={memberOptions}
          templateCount={templateCount}
        />
      ) : null}

      <AccountsChecklistGridBoard grid={grid} />
    </div>
  );
}
