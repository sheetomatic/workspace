import Link from "next/link";
import type { ChecklistTeam } from "@prisma/client";
import {
  CalendarClock,
  ClipboardList,
  ListChecks,
  Settings2,
} from "lucide-react";
import { ChecklistTaskRows } from "@/components/saas/checklist-task-rows";
import {
  CHECKLIST_FREQUENCY_LABELS,
  CHECKLIST_TEAM_LABELS,
} from "@/lib/checklists/constants";
import type { TeamChecklistProfile } from "@/lib/checklists/team-checklist-profiles";
import type { ChecklistTaskRow } from "@/lib/checklists/queries";

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

type Member = { id: string; name: string | null; email: string };

export function TeamChecklistBoard({
  team,
  profile,
  templates,
  tasks,
  canConfigure,
  isAdmin,
  currentUserId,
  members,
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
  tasks: ChecklistTaskRow[];
  canConfigure: boolean;
  isAdmin: boolean;
  currentUserId: string;
  members: Member[];
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

      <section className="ws-sf-list-view ws-team-checklist-panel ws-team-checklist-mine">
        <header className="ws-sf-list-view-header">
          <div className="ws-sf-list-view-title">
            <h2>{teamLabel} Check List tasks</h2>
            <span className="ws-sf-list-view-count">{tasks.length}</span>
          </div>
          <p className="ws-team-checklist-section-lead">
            Tick to complete. Update to add notes or upload proof. Admins can edit or delete
            the schedule.
          </p>
        </header>
        <ChecklistTaskRows
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          members={members}
          tasks={tasks}
        />
      </section>

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
  );
}
