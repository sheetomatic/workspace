import Link from "next/link";
import {
  CHECKLIST_FREQUENCY_LABELS,
} from "@/lib/checklists/constants";
import {
  HR_CHECKLIST_GROUPS,
  getHrFocusGroup,
  matchesHrFocus,
  type HrFocusId,
} from "@/lib/checklists/hr-checklist-catalog";
import type { PcWorkItem } from "@/lib/checklists/pc-work";
import { ChecklistMyRunsBoard } from "@/components/saas/checklist-my-runs-board";
import { HrChecklistDeployPanel } from "@/components/saas/hr-checklist-deploy";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";

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
    return `${freq} · ${days[template.dueWeekday ?? 1]}`;
  }
  if (template.dueMonthDay) {
    return `${freq} · day ${template.dueMonthDay}`;
  }
  return freq;
}

function focusHref(focusId: HrFocusId | null) {
  return focusId ? `/app/checklists/hr?tab=${focusId}` : "/app/checklists/hr";
}

type MyRun = Parameters<typeof ChecklistMyRunsBoard>[0]["occurrences"][number];

export function HrChecklistBoard({
  templates,
  openRuns,
  myRuns,
  canConfigure,
  members,
  activeTab,
}: {
  templates: Array<{
    id: string;
    title: string;
    instructions: string | null;
    frequency: string;
    dueMonthDay: number | null;
    dueWeekday: number | null;
    assignee: { name: string | null; email: string };
    _count: { occurrences: number };
  }>;
  openRuns: PcWorkItem[];
  myRuns: MyRun[];
  canConfigure: boolean;
  members: Array<{ id: string; label: string }>;
  activeTab: HrFocusId | null;
}) {
  const focusGroup = getHrFocusGroup(activeTab);
  const overdueCount = openRuns.filter((run) => run.overdue).length;

  const filteredRuns = openRuns.filter((run) =>
    matchesHrFocus(`${run.title} ${run.subtitle}`, activeTab),
  );
  const filteredTemplates = templates.filter((template) =>
    matchesHrFocus(
      `${template.title} ${template.instructions ?? ""}`,
      activeTab,
    ),
  );

  const suggestedGroups = activeTab
    ? HR_CHECKLIST_GROUPS.filter((group) => group.id === activeTab)
    : HR_CHECKLIST_GROUPS;

  const installedTitles = new Set(
    templates.map((row) => row.title.toLowerCase()),
  );
  const suggestedItems = suggestedGroups.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      focusLabel: group.label,
      installed: installedTitles.has(item.title.toLowerCase()),
    })),
  );
  const missingSuggested = suggestedItems.filter((item) => !item.installed);

  return (
    <div className="saas-page ws-checklists-page ws-tasks-sf ws-fms-sf ws-hr-checklist-page">
      <TaskPageToolbar
        title="HR Check List"
        description="People operations Process Checklists — onboarding, attendance, leave, and policy compliance."
        actions={
          canConfigure ? (
            <>
              <Link href="/app/checklists/setup" className="btn-secondary btn-sm">
                Setup
              </Link>
              <Link
                href="/app/checklists/new"
                className="btn-primary btn-sm ws-sf-btn-primary"
              >
                New checklist
              </Link>
            </>
          ) : null
        }
      />

      <div className="ws-sf-metrics ws-hr-checklist-metrics">
        <div className={`ws-sf-metric-tile${overdueCount > 0 ? " is-active" : ""}`}>
          <span>Overdue</span>
          <strong className={overdueCount > 0 ? "is-late" : undefined}>
            {overdueCount}
          </strong>
          <span className="ws-stat-card-hint">Chase first</span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>Open runs</span>
          <strong>{openRuns.length}</strong>
          <span className="ws-stat-card-hint">In progress</span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>Live schedules</span>
          <strong>{templates.length}</strong>
          <span className="ws-stat-card-hint">Active HR PCs</span>
        </div>
      </div>

      <nav className="ws-hr-checklist-tabs" aria-label="HR checklist focus">
        <Link
          href={focusHref(null)}
          className={`ws-hr-checklist-tab${!activeTab ? " is-active" : ""}`}
          aria-current={!activeTab ? "page" : undefined}
        >
          All
        </Link>
        {HR_CHECKLIST_GROUPS.map((group) => (
          <Link
            key={group.id}
            href={focusHref(group.id)}
            className={`ws-hr-checklist-tab${activeTab === group.id ? " is-active" : ""}`}
            aria-current={activeTab === group.id ? "page" : undefined}
          >
            {group.label}
          </Link>
        ))}
      </nav>

      {focusGroup ? (
        <p className="ws-hr-checklist-tab-lead">{focusGroup.description}</p>
      ) : null}

      {myRuns.length > 0 ? (
        <section className="ws-sf-list-view" aria-label="Your HR items">
          <header className="ws-sf-list-view-header">
            <div className="ws-sf-list-view-title">
              <h2>Your HR items due</h2>
              <span className="ws-sf-list-view-count">{myRuns.length}</span>
            </div>
          </header>
          <ChecklistMyRunsBoard occurrences={myRuns} />
        </section>
      ) : null}

      <section className="ws-sf-list-view" aria-label="Open HR runs">
        <header className="ws-sf-list-view-header">
          <div className="ws-sf-list-view-title">
            <h2>Open HR runs</h2>
            <span className="ws-sf-list-view-count">{filteredRuns.length}</span>
          </div>
          <p className="ws-em-section-lead">
            Live Process Checklist runs for people ops. Exceptions first.
          </p>
        </header>
        {filteredRuns.length === 0 ? (
          <div className="ws-empty-state ws-fms-empty-state is-positive ws-hr-checklist-empty">
            <p>
              {templates.length === 0
                ? "No open HR runs yet. Install suggested templates below to start."
                : "No open HR checklist runs right now."}
            </p>
            {templates.length === 0 && canConfigure ? (
              <Link
                href="#hr-suggested"
                className="btn-primary btn-sm ws-sf-btn-primary"
              >
                Install templates
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="ws-sf-table-wrap">
            <table className="ws-fms-data-table ws-sf-data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Owner</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filteredRuns.map((run) => (
                  <tr
                    key={run.id}
                    className={run.overdue ? "is-overdue" : undefined}
                  >
                    <td>
                      <strong>{run.title}</strong>
                    </td>
                    <td>{run.owner}</td>
                    <td>{run.dueLabel}</td>
                    <td>
                      <span
                        className={`ws-hr-status-pill${run.overdue ? " is-overdue" : ""}`}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td>
                      <Link href={run.href} className="btn-secondary btn-sm">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="ws-sf-list-view" aria-label="Live HR schedules">
        <header className="ws-sf-list-view-header">
          <div className="ws-sf-list-view-title">
            <h2>Live HR schedules</h2>
            <span className="ws-sf-list-view-count">
              {filteredTemplates.length}
            </span>
          </div>
          <p className="ws-em-section-lead">
            Recurring HR Process Checklists with owner and due rule.
          </p>
        </header>
        {filteredTemplates.length === 0 ? (
          <div className="ws-empty-state ws-hr-checklist-empty">
            <p>
              {templates.length === 0
                ? "No HR checklists configured yet."
                : "No schedules match this focus. Try All or install the suggested pack."}
            </p>
            {canConfigure ? (
              <Link
                href={templates.length === 0 ? "#hr-suggested" : "/app/checklists/new"}
                className="btn-primary btn-sm ws-sf-btn-primary"
              >
                {templates.length === 0 ? "Install templates" : "New checklist"}
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="ws-sf-table-wrap">
            <table className="ws-fms-data-table ws-sf-data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Owner</th>
                  <th>Schedule</th>
                  <th>Runs</th>
                </tr>
              </thead>
              <tbody>
                {filteredTemplates.map((template) => (
                  <tr key={template.id}>
                    <td>
                      <strong>{template.title}</strong>
                      {template.instructions ? (
                        <p className="ws-fms-muted">{template.instructions}</p>
                      ) : null}
                    </td>
                    <td>
                      {template.assignee.name ??
                        template.assignee.email.split("@")[0]}
                    </td>
                    <td>{formatDueRule(template)}</td>
                    <td>{template._count.occurrences}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {canConfigure && missingSuggested.length > 0 ? (
        <section
          id="hr-suggested"
          className="ws-sf-list-view"
          aria-label="Suggested HR templates"
        >
          <header className="ws-sf-list-view-header">
            <div className="ws-sf-list-view-title">
              <h2>Suggested templates</h2>
              <span className="ws-sf-list-view-count">
                {missingSuggested.length}
              </span>
            </div>
            <p className="ws-em-section-lead">
              Install into Setup with one owner — schedules become live runs
              automatically.
            </p>
          </header>

          <div className="ws-sf-table-wrap">
            <table className="ws-fms-data-table ws-sf-data-table">
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Focus</th>
                  <th>Frequency</th>
                  <th>Owner role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {suggestedItems.map((item) => (
                  <tr key={item.id} className={item.installed ? "is-muted" : undefined}>
                    <td>
                      <strong>{item.title}</strong>
                      {item.instructions ? (
                        <p className="ws-fms-muted">{item.instructions}</p>
                      ) : null}
                    </td>
                    <td>{item.focusLabel}</td>
                    <td>
                      {CHECKLIST_FREQUENCY_LABELS[item.frequency] ??
                        item.frequency}
                    </td>
                    <td>{item.ownerRole}</td>
                    <td>
                      {item.installed ? (
                        <span className="ws-hr-status-pill is-done">Installed</span>
                      ) : (
                        <span className="ws-hr-status-pill">Suggested</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <HrChecklistDeployPanel
            members={members}
            focusId={activeTab}
            focusLabel={focusGroup?.label ?? null}
          />
        </section>
      ) : null}
    </div>
  );
}
