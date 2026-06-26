import Link from "next/link";
import { PcMonitorBoard, PcMonitorMetrics } from "@/components/saas/pc-monitor-board";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import {
  CHECKLIST_FREQUENCY_LABELS,
  CHECKLIST_TEAM_LABELS,
} from "@/lib/checklists/constants";
import { listChecklistTemplates } from "@/lib/checklists/queries";
import { listOrgPcMonitor } from "@/lib/checklists/pc-work";
import { canAccessEmReady } from "@/lib/em/em-access";
import { canCreateTasks, listAssignableMembers } from "@/lib/tasks";
import { requireSession } from "@/lib/require-session";
import { hasWorkspaceModule } from "@/lib/workspace-modules";
import { redirect } from "next/navigation";

function formatDueRule(template: {
  frequency: string;
  dueMonthDay: number | null;
  dueWeekday: number | null;
}) {
  const freq =
    CHECKLIST_FREQUENCY_LABELS[
      template.frequency as keyof typeof CHECKLIST_FREQUENCY_LABELS
    ] ?? template.frequency;
  if (template.frequency === "WEEKLY") {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `${freq} - ${days[template.dueWeekday ?? 1]}`;
  }
  if (template.dueMonthDay) {
    return `${freq} - day ${template.dueMonthDay}`;
  }
  return freq;
}

export default async function ChecklistsMonitorPage() {
  const user = await requireSession(undefined, { module: "TASKS" });
  const isManager = canCreateTasks(user.role);

  if (!isManager) {
    redirect("/app/checklists/my-tasks");
  }

  const showEmReady = canAccessEmReady(user);
  const fmsEnabled = hasWorkspaceModule(user, "FMS");

  const [templates, monitor, members] = await Promise.all([
    listChecklistTemplates(user.organizationId),
    listOrgPcMonitor(user.organizationId),
    listAssignableMembers(user.organizationId),
  ]);

  const fmsSteps = fmsEnabled ? monitor.fmsSteps : [];
  const overdueCount =
    monitor.checklists.filter((row) => row.overdue).length +
    monitor.eaTasks.filter((row) => row.overdue).length +
    fmsSteps.filter((row) => row.overdue).length;

  return (
    <div className="saas-page ws-checklists-page ws-tasks-sf ws-pc-monitor-page">
      <TaskPageToolbar
        title="PC monitor"
        description="Chase overdue checklist, EA, and FMS work until complete."
        actions={
          <div className="ws-pc-toolbar-actions">
            <Link href="/app/tasks/create" className="btn-primary btn-sm ws-sf-btn-primary">
              Assign task
            </Link>
            <Link href="/app/checklists/setup" className="btn-secondary btn-sm">
              Setup
            </Link>
            <Link href="/app/checklists/scores" className="btn-secondary btn-sm">
              MIS
            </Link>
            {showEmReady ? (
              <Link href="/app/em" className="btn-secondary btn-sm">
                EM
              </Link>
            ) : null}
          </div>
        }
      />

      <PcMonitorMetrics
        overdueCount={overdueCount}
        checklistCount={monitor.checklists.length}
        eaCount={monitor.eaTasks.length}
        fmsCount={fmsSteps.length}
        fmsEnabled={fmsEnabled}
      />

      <PcMonitorBoard
        checklists={monitor.checklists}
        eaTasks={monitor.eaTasks}
        fmsSteps={fmsSteps}
        fmsEnabled={fmsEnabled}
        members={members}
      />

      <section className="ws-sf-list-view ws-pc-schedules-section">
        <header className="ws-sf-list-view-header">
          <div className="ws-sf-list-view-title">
            <h2>Live schedules</h2>
            <span className="ws-sf-list-view-count">{templates.length}</span>
          </div>
        </header>

        {templates.length === 0 ? (
          <div className="ws-empty-state ws-fms-empty-state">
            <p>No recurring schedules yet.</p>
            <Link href="/app/checklists/setup" className="btn-primary btn-sm ws-sf-btn-primary">
              Open setup
            </Link>
          </div>
        ) : (
          <div className="ws-sf-table-wrap">
            <table className="ws-fms-data-table ws-sf-data-table ws-pc-schedules-table">
              <thead>
                <tr>
                  <th>Checklist</th>
                  <th>Team</th>
                  <th>Schedule</th>
                  <th>Doer</th>
                  <th>Runs</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id}>
                    <td>
                      <strong>{template.title}</strong>
                      {template.instructions ? (
                        <p className="ws-fms-muted">{template.instructions}</p>
                      ) : null}
                    </td>
                    <td>{CHECKLIST_TEAM_LABELS[template.team]}</td>
                    <td>{formatDueRule(template)}</td>
                    <td>
                      {template.assignee.name ?? template.assignee.email.split("@")[0]}
                    </td>
                    <td>{template._count.occurrences}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
