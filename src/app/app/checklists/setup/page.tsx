import Link from "next/link";
import { PcAiSetupPanel } from "@/components/saas/pc-ai-setup-panel";
import { ChecklistImport } from "@/components/saas/checklist-import";
import { PcSetupAiBar } from "@/components/saas/pc-setup-ai-bar";
import { PcTemplateLibraryBoard } from "@/components/saas/pc-template-library-board";
import { FmsSetupItemCard } from "@/components/saas/fms-setup-item-card";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import {
  CHECKLIST_FREQUENCY_LABELS,
  CHECKLIST_TEAM_LABELS,
} from "@/lib/checklists/constants";
import { canConfigureChecklists } from "@/lib/checklists/access";
import { listChecklistTemplates } from "@/lib/checklists/queries";
import { requireSession } from "@/lib/require-session";
import { canCreateTasks } from "@/lib/tasks";
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

export default async function PcSetupPage() {
  const user = await requireSession(undefined, { module: "TASKS" });
  const isManager = canCreateTasks(user.role);
  if (!isManager) {
    redirect("/app/checklists/my-tasks");
  }

  const canConfigure = canConfigureChecklists(user);
  const templates = await listChecklistTemplates(user.organizationId);
  const totalRuns = templates.reduce((sum, row) => sum + row._count.occurrences, 0);

  return (
    <div className="saas-page ws-checklists-page ws-tasks-sf ws-fms-sf ws-pc-setup-page">
      <TaskPageToolbar
        title="Setup"
        description="AI-powered Process Checklist templates, schedules, and live runs - same setup pattern as FMS."
        actions={
          <>
            <Link href="/app/checklists" className="btn-secondary btn-sm">
              PC monitor
            </Link>
            {canConfigure ? (
              <Link href="/app/checklists/new" className="btn-primary btn-sm ws-sf-btn-primary">
                New checklist
              </Link>
            ) : null}
          </>
        }
      />

      <PcAiSetupPanel canConfigure={canConfigure} />

      <div className="ws-sf-metrics ws-fms-metrics">
        <div className="ws-sf-metric-tile">
          <span>Live schedules</span>
          <strong>{templates.length}</strong>
          <span className="ws-stat-card-hint">Active in workspace</span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>Total runs</span>
          <strong>{totalRuns}</strong>
          <span className="ws-stat-card-hint">All occurrences</span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>AI starters</span>
          <strong>6</strong>
          <span className="ws-stat-card-hint">Department templates</span>
        </div>
      </div>

      <PcSetupAiBar canConfigure={canConfigure} />
      {canConfigure ? <ChecklistImport /> : null}

      <section className="ws-sf-list-view" aria-label="Live PC schedules">
        <header className="ws-sf-list-view-header">
          <div className="ws-sf-list-view-title">
            <h2>Live PC schedules</h2>
            <span className="ws-sf-list-view-count">{templates.length}</span>
          </div>
          <p className="ws-em-section-lead">
            Recurring checklists running in your workspace. PC monitors doers and sends reminders.
          </p>
        </header>

        {templates.length === 0 ? (
          <div className="ws-empty-state ws-fms-empty-state">
            <p>No live schedules yet. Pick an AI starter or ask admin to activate a template.</p>
            {canConfigure ? (
              <Link href="/app/checklists/new" className="btn-primary btn-sm ws-sf-btn-primary">
                New AI checklist
              </Link>
            ) : null}
          </div>
        ) : (
          <ul className="ws-fms-setup-list">
            {templates.map((template) => (
              <FmsSetupItemCard
                key={template.id}
                href="/app/checklists"
                title={template.title}
                subtitle={
                  <>
                    {CHECKLIST_TEAM_LABELS[template.team]} - {formatDueRule(template)}
                    {" - "}
                    {template.assignee.name ?? template.assignee.email.split("@")[0]}
                    {" - "}
                    {template._count.occurrences} run
                    {template._count.occurrences === 1 ? "" : "s"}
                  </>
                }
              />
            ))}
          </ul>
        )}
      </section>

      <PcTemplateLibraryBoard />
    </div>
  );
}
