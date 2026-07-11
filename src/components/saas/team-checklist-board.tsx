import Link from "next/link";
import type { ChecklistTeam } from "@prisma/client";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  ListChecks,
  Settings2,
} from "lucide-react";
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
      <header className="ws-page-header has-actions ws-team-checklist-hero">
        <div className="ws-page-header-copy">
          <p className="ws-team-checklist-eyebrow">Department checklist</p>
          <h1>{profile.title}</h1>
          <p>{profile.description}</p>
          <ul className="ws-team-checklist-focus" aria-label="Focus areas">
            {profile.focusAreas.map((area) => (
              <li key={area}>{area}</li>
            ))}
          </ul>
        </div>
        {canConfigure ? (
          <div className="ws-page-header-actions">
            <Link
              href="/app/checklists/setup"
              className="btn-primary btn-sm ws-sf-btn-primary"
            >
              <Settings2 size={14} aria-hidden />
              Add from Setup
            </Link>
            <Link href="/app/checklists/setup" className="btn-secondary btn-sm">
              Setup
            </Link>
          </div>
        ) : null}
      </header>

      {myRuns.length > 0 ? (
        <section className="ws-sf-list-view ws-team-checklist-panel ws-team-checklist-mine">
          <header className="ws-sf-list-view-header">
            <div className="ws-sf-list-view-title">
              <h2>Your {teamLabel} items due</h2>
              <span className="ws-sf-list-view-count">{myRuns.length}</span>
            </div>
          </header>
          <ChecklistMyRunsBoard occurrences={myRuns} />
        </section>
      ) : null}

      <section className="ws-sf-list-view ws-team-checklist-panel ws-team-checklist-examples">
        <header className="ws-sf-list-view-header">
          <div className="ws-sf-list-view-title">
            <h2>Typical {teamLabel} activities</h2>
          </div>
          <p className="ws-team-checklist-section-lead">
            Reference activities — turn them into recurring checklists with owners
            and proof in Setup.
          </p>
        </header>
        <ul className="ws-team-checklist-activity-grid">
          {profile.sampleActivities.map((row) => (
            <li key={row.activity} className="ws-team-checklist-activity-card">
              <div className="ws-team-checklist-activity-icon" aria-hidden>
                <ListChecks size={16} strokeWidth={1.75} />
              </div>
              <div className="ws-team-checklist-activity-body">
                <strong>{row.activity}</strong>
                <div className="ws-team-checklist-activity-meta">
                  <span>{row.frequency}</span>
                  <span aria-hidden>·</span>
                  <span>{row.ownerRole}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="ws-team-checklist-split">
        <section className="ws-sf-list-view ws-team-checklist-panel ws-team-checklist-open">
          <header className="ws-sf-list-view-header">
            <div className="ws-sf-list-view-title">
              <h2>Open {teamLabel} runs</h2>
              <span className="ws-sf-list-view-count">{openRuns.length}</span>
            </div>
          </header>
          {openRuns.length === 0 ? (
            <div className="ws-team-checklist-empty is-clear">
              <div className="ws-team-checklist-empty-icon" aria-hidden>
                <CheckCircle2 size={22} strokeWidth={1.75} />
              </div>
              <strong>All clear</strong>
              <p>
                No open {teamLabel.toLowerCase()} checklist runs right now.
                Scheduled runs will appear here when due.
              </p>
            </div>
          ) : (
            <ul className="ws-team-checklist-run-list">
              {openRuns.map((run) => (
                <li
                  key={run.id}
                  className={`ws-team-checklist-run-row${run.overdue ? " is-overdue" : ""}`}
                >
                  <div className="ws-team-checklist-run-main">
                    <strong>{run.title}</strong>
                    <span className="ws-team-checklist-run-owner">{run.owner}</span>
                  </div>
                  <div className="ws-team-checklist-run-side">
                    <span className="ws-team-checklist-run-due">{run.dueLabel}</span>
                    <span
                      className={`ws-team-checklist-status${run.overdue ? " is-overdue" : ""}`}
                    >
                      {run.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ws-sf-list-view ws-team-checklist-panel ws-team-checklist-schedules">
          <header className="ws-sf-list-view-header">
            <div className="ws-sf-list-view-title">
              <h2>Live {teamLabel} schedules</h2>
              <span className="ws-sf-list-view-count">{templates.length}</span>
            </div>
          </header>
          {templates.length === 0 ? (
            <div className="ws-team-checklist-empty">
              <div className="ws-team-checklist-empty-icon" aria-hidden>
                <CalendarClock size={22} strokeWidth={1.75} />
              </div>
              <strong>No schedules yet</strong>
              <p>
                No {teamLabel.toLowerCase()} checklists configured. Add a
                template with owner, frequency, and proof from Setup.
              </p>
              {canConfigure ? (
                <Link
                  href="/app/checklists/setup"
                  className="btn-primary btn-sm ws-sf-btn-primary"
                >
                  <ClipboardList size={14} aria-hidden />
                  Add from Setup
                </Link>
              ) : null}
            </div>
          ) : (
            <ul className="ws-team-checklist-schedule-list">
              {templates.map((template) => (
                <li key={template.id} className="ws-team-checklist-schedule-row">
                  <div className="ws-team-checklist-schedule-main">
                    <strong>{template.title}</strong>
                    {template.instructions ? (
                      <p className="ws-fms-muted">{template.instructions}</p>
                    ) : null}
                  </div>
                  <div className="ws-team-checklist-schedule-meta">
                    <span>{formatDueRule(template)}</span>
                    <span>
                      {template.assignee.name ??
                        template.assignee.email.split("@")[0]}
                    </span>
                    <span className="ws-team-checklist-run-count">
                      {template._count.occurrences}{" "}
                      {template._count.occurrences === 1 ? "run" : "runs"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
