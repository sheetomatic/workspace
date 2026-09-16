import Link from "next/link";
import { Suspense } from "react";
import { BarChart3 } from "lucide-react";
import { CHECKLIST_FREQUENCY_LABELS } from "@/lib/checklists/constants";
import {
  HR_CHECKLIST_GROUPS,
  getHrFocusGroup,
  matchesHrFocus,
  type HrFocusId,
} from "@/lib/checklists/hr-checklist-catalog";
import { ChecklistDepartmentChips } from "@/components/saas/checklist-department-chips";
import { ChecklistPcFilters } from "@/components/saas/checklist-pc-filters";
import { ChecklistRowsTable } from "@/components/saas/checklist-rows-table";
import { HrChecklistDeployPanel } from "@/components/saas/hr-checklist-deploy";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import type { ChecklistPcRow } from "@/lib/checklists/pc-rows";

function focusHref(focusId: HrFocusId | null) {
  return focusId ? `/app/checklists/hr?tab=${focusId}` : "/app/checklists/hr";
}

export function HrChecklistBoard({
  rows,
  doers,
  canConfigure,
  members,
  activeTab,
  filters,
  installedTitles,
}: {
  rows: ChecklistPcRow[];
  doers: { id: string; name: string }[];
  canConfigure: boolean;
  members: Array<{ id: string; label: string }>;
  activeTab: HrFocusId | null;
  filters: {
    due?: string;
    date?: string;
    doer?: string;
    department?: string;
  };
  installedTitles: string[];
}) {
  const focusGroup = getHrFocusGroup(activeTab);
  const overdueCount = rows.filter((row) => row.overdue).length;
  const filteredRows = rows.filter((row) =>
    matchesHrFocus(`${row.title} ${row.instructions ?? ""}`, activeTab),
  );

  const suggestedGroups = activeTab
    ? HR_CHECKLIST_GROUPS.filter((group) => group.id === activeTab)
    : HR_CHECKLIST_GROUPS;

  const installed = new Set(installedTitles.map((title) => title.toLowerCase()));
  const suggestedItems = suggestedGroups.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      focusLabel: group.label,
      installed: installed.has(item.title.toLowerCase()),
    })),
  );
  const missingSuggested = suggestedItems.filter((item) => !item.installed);

  return (
    <div className="saas-page ws-checklists-page ws-tasks-sf ws-fms-sf ws-hr-checklist-page ws-pc-sheet-page">
      <TaskPageToolbar
        title="HR Check List"
        description="People operations Process Checklists — onboarding, attendance, leave, and policy compliance."
        actions={
          <>
            <Link href="/app/checklists/scores" className="btn-secondary btn-sm">
              <BarChart3 size={14} aria-hidden />
              Performance
            </Link>
            {canConfigure ? (
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
            ) : null}
          </>
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
          <span>Open items</span>
          <strong>{rows.length}</strong>
          <span className="ws-stat-card-hint">In this filter</span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>Live schedules</span>
          <strong>{installedTitles.length}</strong>
          <span className="ws-stat-card-hint">Active HR PCs</span>
        </div>
      </div>

      <Suspense fallback={null}>
        <ChecklistDepartmentChips activeTeam={filters.department ?? "HR"} />
        <ChecklistPcFilters doers={doers} current={filters} />
      </Suspense>

      <nav className="ws-hr-checklist-tabs" aria-label="HR checklist focus">
        <Link
          href={focusHref(null)}
          className={`ws-hr-checklist-tab${!activeTab ? " is-active" : ""}`}
          aria-current={!activeTab ? "page" : undefined}
          title="All focus areas"
        >
          <span className="ws-hr-checklist-tab-full">All</span>
          <span className="ws-hr-checklist-tab-short" aria-hidden>
            All
          </span>
        </Link>
        {HR_CHECKLIST_GROUPS.map((group) => (
          <Link
            key={group.id}
            href={focusHref(group.id)}
            className={`ws-hr-checklist-tab${activeTab === group.id ? " is-active" : ""}`}
            aria-current={activeTab === group.id ? "page" : undefined}
            aria-label={group.label}
            title={group.label}
          >
            <span className="ws-hr-checklist-tab-full">{group.label}</span>
            <span className="ws-hr-checklist-tab-short" aria-hidden>
              {group.shortLabel}
            </span>
          </Link>
        ))}
      </nav>

      {focusGroup ? (
        <p className="ws-hr-checklist-tab-lead">{focusGroup.description}</p>
      ) : null}

      <section className="ws-sf-list-view ws-pc-sheet-panel" aria-label="HR checklist rows">
        <header className="ws-sf-list-view-header">
          <div className="ws-sf-list-view-title">
            <h2>Checklist tasks</h2>
            <span className="ws-sf-list-view-count">{filteredRows.length}</span>
          </div>
          <p className="ws-em-section-lead">
            One row per HR process checklist item. Mark done stays on the row.
          </p>
        </header>
        <ChecklistRowsTable
          canManage={canConfigure}
          emptyMessage="No HR checklist tasks match these filters."
          members={members}
          rows={filteredRows}
        />
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
              Install into Setup with one owner — schedules become live rows
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
                    <td data-label="Activity">
                      <strong>{item.title}</strong>
                      {item.instructions ? (
                        <p className="ws-fms-muted">{item.instructions}</p>
                      ) : null}
                    </td>
                    <td data-label="Focus">{item.focusLabel}</td>
                    <td data-label="Frequency">
                      {CHECKLIST_FREQUENCY_LABELS[item.frequency] ?? item.frequency}
                    </td>
                    <td data-label="Owner role">{item.ownerRole}</td>
                    <td data-label="Status">
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
