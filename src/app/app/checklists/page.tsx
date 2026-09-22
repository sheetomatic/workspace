import Link from "next/link";
import type { ChecklistTeam } from "@prisma/client";
import { ChecklistTaskRows } from "@/components/saas/checklist-task-rows";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { canAdminChecklists } from "@/lib/checklists/access";
import {
  CHECKLIST_DEPARTMENTS,
  CHECKLIST_FREQUENCY_LABELS,
  CHECKLIST_TEAM_LABELS,
} from "@/lib/checklists/constants";
import {
  listChecklistTemplates,
  listOpenChecklistTasks,
} from "@/lib/checklists/queries";
import { canCreateTasks, listAssignableMembers } from "@/lib/tasks";
import { requireSession } from "@/lib/require-session";
import { BCI_OPS_MODULES } from "@/lib/workspace-modules";

function parseDepartment(value: string | undefined): ChecklistTeam | null {
  if (!value) return null;
  return CHECKLIST_DEPARTMENTS.includes(value as ChecklistTeam)
    ? (value as ChecklistTeam)
    : null;
}

function formatDueRule(template: {
  frequency: string;
  dueMonthDay: number | null;
  dueWeekday: number | null;
}) {
  const freq =
    CHECKLIST_FREQUENCY_LABELS[
      template.frequency as keyof typeof CHECKLIST_FREQUENCY_LABELS
    ] ?? template.frequency;
  if (template.frequency === "WEEKLY" || template.frequency === "FORTNIGHTLY") {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `${freq} · ${days[template.dueWeekday ?? 1]}`;
  }
  if (template.dueMonthDay) return `${freq} · day ${template.dueMonthDay}`;
  return freq;
}

export default async function ChecklistsHubPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
}) {
  const user = await requireSession(undefined, { anyModules: BCI_OPS_MODULES });
  const department = parseDepartment((await searchParams).team);
  const isAdmin = canAdminChecklists(user);
  const canConfigure = canCreateTasks(user.role);

  const [tasks, templates, assignable] = await Promise.all([
    listOpenChecklistTasks(user.organizationId, department ?? undefined),
    listChecklistTemplates(user.organizationId),
    listAssignableMembers(user.organizationId),
  ]);

  const schedules = department
    ? templates.filter((row) => row.team === department)
    : templates;
  const departmentLabel = department
    ? CHECKLIST_TEAM_LABELS[department]
    : "All departments";

  return (
    <div className="saas-page ws-checklists-page ws-tasks-sf">
      <TaskPageToolbar
        title="Check Lists"
        description="Every department. A General checklist stays on this list — it is not filed under Accounts, HR, or Maintenance."
        actions={
          canConfigure ? (
            <Link href="/app/checklists/new" className="btn-primary btn-sm ws-sf-btn-primary">
              New checklist
            </Link>
          ) : null
        }
      />

      <nav className="ws-cl-dept-filters" aria-label="Department">
        <Link
          href="/app/checklists"
          className={`ws-cl-dept-filter${!department ? " is-active" : ""}`}
          aria-current={!department ? "page" : undefined}
        >
          All
        </Link>
        {CHECKLIST_DEPARTMENTS.map((team) => (
          <Link
            key={team}
            href={`/app/checklists?team=${team}`}
            className={`ws-cl-dept-filter${department === team ? " is-active" : ""}`}
            aria-current={department === team ? "page" : undefined}
          >
            {CHECKLIST_TEAM_LABELS[team]}
          </Link>
        ))}
      </nav>

      <section className="ws-sf-list-view" aria-label={`${departmentLabel} checklist tasks`}>
        <header className="ws-sf-list-view-header">
          <div className="ws-sf-list-view-title">
            <h2>{departmentLabel}</h2>
            <span className="ws-sf-list-view-count">{tasks.length}</span>
          </div>
          <p className="ws-em-section-lead">Open checklist tasks. Tick to complete.</p>
        </header>
        <ChecklistTaskRows
          currentUserId={user.id}
          isAdmin={isAdmin}
          members={assignable.map((member) => ({
            id: member.id,
            name: member.name,
            email: member.email,
          }))}
          showDepartment={!department}
          tasks={tasks}
        />
      </section>

      <section className="ws-sf-list-view" aria-label="Live schedules">
        <header className="ws-sf-list-view-header">
          <div className="ws-sf-list-view-title">
            <h2>Schedules</h2>
            <span className="ws-sf-list-view-count">{schedules.length}</span>
          </div>
        </header>
        {schedules.length === 0 ? (
          <div className="ws-empty-state">
            <p>No checklist saved for {departmentLabel.toLowerCase()} yet.</p>
          </div>
        ) : (
          <ul className="ws-team-checklist-schedule-list">
            {schedules.map((template) => (
              <li key={template.id} className="ws-team-checklist-schedule-row">
                <div className="ws-team-checklist-schedule-main">
                  <strong>{template.title}</strong>
                  <p className="ws-fms-muted">
                    {CHECKLIST_TEAM_LABELS[template.team] ?? template.team}
                    {" · "}
                    {formatDueRule(template)}
                    {" · "}
                    {template.assignee.name ?? template.assignee.email.split("@")[0]}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
