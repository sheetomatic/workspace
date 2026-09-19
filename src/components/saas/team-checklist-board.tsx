import Link from "next/link";
import { Suspense } from "react";
import { BarChart3, Settings2 } from "lucide-react";
import type { ChecklistTeam } from "@prisma/client";
import { ChecklistDepartmentChips } from "@/components/saas/checklist-department-chips";
import { ChecklistPcFilters } from "@/components/saas/checklist-pc-filters";
import { ChecklistRowsTable } from "@/components/saas/checklist-rows-table";
import type { TeamChecklistProfile } from "@/lib/checklists/team-checklist-profiles";
import type { ChecklistPcRow } from "@/lib/checklists/pc-rows";

export function TeamChecklistBoard({
  team,
  profile,
  rows,
  doers,
  members,
  canConfigure,
  filters,
}: {
  team: ChecklistTeam;
  profile: TeamChecklistProfile;
  rows: ChecklistPcRow[];
  doers: { id: string; name: string }[];
  members: Array<{ id: string; label: string }>;
  canConfigure: boolean;
  filters: {
    due?: string;
    date?: string;
    doer?: string;
    department?: string;
  };
}) {
  return (
    <div className="saas-page ws-checklists-page ws-tasks-sf ws-team-checklist-page ws-pc-sheet-page">
      <header className="ws-page-header has-actions ws-team-checklist-hero">
        <div className="ws-page-header-copy">
          <p className="ws-team-checklist-eyebrow">Process checklist</p>
          <h1>{profile.title}</h1>
          <p>{profile.description}</p>
        </div>
        <div className="ws-page-header-actions">
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
                href="/app/checklists/setup"
                className="btn-primary btn-sm ws-sf-btn-primary"
              >
                <Settings2 size={14} aria-hidden />
                Add from Setup
              </Link>
            </>
          ) : null}
        </div>
      </header>

      <Suspense fallback={null}>
        <ChecklistDepartmentChips activeTeam={filters.department ?? team} />
        <ChecklistPcFilters doers={doers} current={filters} />
      </Suspense>

      <section className="ws-sf-list-view ws-pc-sheet-panel" aria-label={`${profile.title} rows`}>
        <header className="ws-sf-list-view-header">
          <div className="ws-sf-list-view-title">
            <h2>Checklist tasks</h2>
            <span className="ws-sf-list-view-count">{rows.length}</span>
          </div>
          <p className="ws-em-section-lead">
            One row per process checklist item — same sheet rhythm as BCI PC.
          </p>
        </header>
        <ChecklistRowsTable
          canManage={canConfigure}
          emptyMessage={
            canConfigure
              ? "No checklist tasks match these filters. Add from Setup, or clear filters."
              : "No checklist tasks match these filters."
          }
          members={members}
          rows={rows}
        />
      </section>
    </div>
  );
}
