import Link from "next/link";
import type { ChecklistTeam } from "@prisma/client";
import { ChecklistMyRunsBoard } from "@/components/saas/checklist-my-runs-board";
import {
  CHECKLIST_FREQUENCY_LABELS,
  CHECKLIST_TEAM_LABELS,
} from "@/lib/checklists/constants";
import type { TeamChecklistProfile } from "@/lib/checklists/team-checklist-profiles";
import type { PcWorkItem } from "@/lib/checklists/pc-work";

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

type MyRun = Parameters<typeof ChecklistMyRunsBoard>[0]["occurrences"][number];

export function TeamChecklistBoard({
  team,
  profile,
  templates,
  openRuns,
  myRuns,
  canConfigure,
}: {
  team: ChecklistTeam;
  profile: TeamChecklistProfile;
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
}) {
  const teamLabel = CHECKLIST_TEAM_LABELS[team] ?? team;

  return (
    <div className="saas-page ws-checklists-page ws-tasks-sf ws-team-checklist-page">
      <header className="ws-page-header ws-team-checklist-hero">
        <div>
          <h1>{profile.title}</h1>
          <p>{profile.description}</p>
          <ul className="ws-team-checklist-focus">
            {profile.focusAreas.map((area) => (
              <li key={area}>{area}</li>
            ))}
          </ul>
        </div>
        {canConfigure ? (
          <div className="ws-page-header-actions">
            <Link href="/app/checklists/setup" className="btn-secondary btn-sm">
              Setup
            </Link>
          </div>
        ) : null}
      </header>

      {myRuns.length > 0 ? (
        <section className="ws-sf-list-view ws-team-checklist-mine">
          <header className="ws-sf-list-view-header">
            <div className="ws-sf-list-view-title">
              <h2>Your {teamLabel} items due</h2>
              <span className="ws-sf-list-view-count">{myRuns.length}</span>
            </div>
          </header>
          <ChecklistMyRunsBoard occurrences={myRuns} />
        </section>
      ) : null}

      <section className="ws-sf-list-view ws-team-checklist-examples">
        <header className="ws-sf-list-view-header">
          <div className="ws-sf-list-view-title">
            <h2>Typical {teamLabel} activities</h2>
          </div>
          <p className="ws-em-section-lead">
            Use Setup to turn these into recurring checklists with owners and proof.
          </p>
        </header>
        <div className="ws-sf-table-wrap">
          <table className="ws-fms-data-table ws-sf-data-table">
            <thead>
              <tr>
                <th>Activity</th>
                <th>Frequency</th>
                <th>Owner role</th>
              </tr>
            </thead>
            <tbody>
              {profile.sampleActivities.map((row) => (
                <tr key={row.activity}>
                  <td>{row.activity}</td>
                  <td>{row.frequency}</td>
                  <td>{row.ownerRole}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ws-sf-list-view ws-team-checklist-open">
        <header className="ws-sf-list-view-header">
          <div className="ws-sf-list-view-title">
            <h2>Open {teamLabel} runs</h2>
            <span className="ws-sf-list-view-count">{openRuns.length}</span>
          </div>
        </header>
        {openRuns.length === 0 ? (
          <div className="ws-empty-state ws-fms-empty-state">
            <p>No open {teamLabel.toLowerCase()} checklist runs right now.</p>
          </div>
        ) : (
          <div className="ws-sf-table-wrap">
            <table className="ws-fms-data-table ws-sf-data-table">
              <thead>
                <tr>
                  <th>Checklist</th>
                  <th>Doer</th>
                  <th>Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {openRuns.map((run) => (
                  <tr key={run.id} className={run.overdue ? "is-overdue" : undefined}>
                    <td>
                      <strong>{run.title}</strong>
                    </td>
                    <td>{run.owner}</td>
                    <td>{run.dueLabel}</td>
                    <td>{run.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="ws-sf-list-view ws-team-checklist-schedules">
        <header className="ws-sf-list-view-header">
          <div className="ws-sf-list-view-title">
            <h2>Live {teamLabel} schedules</h2>
            <span className="ws-sf-list-view-count">{templates.length}</span>
          </div>
        </header>
        {templates.length === 0 ? (
          <div className="ws-empty-state ws-fms-empty-state">
            <p>No {teamLabel.toLowerCase()} checklists configured yet.</p>
            {canConfigure ? (
              <Link href="/app/checklists/setup" className="btn-primary btn-sm ws-sf-btn-primary">
                Add from Setup
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="ws-sf-table-wrap">
            <table className="ws-fms-data-table ws-sf-data-table ws-pc-schedules-table">
              <thead>
                <tr>
                  <th>Checklist</th>
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
