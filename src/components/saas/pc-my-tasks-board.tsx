"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CheckSquare, GitBranch, ListTodo } from "lucide-react";
import type { PcWorkItem } from "@/lib/checklists/pc-work";
import { ChecklistMyRunsBoard } from "@/components/saas/checklist-my-runs-board";
import { PcStatusPill, PcWorkKindBadge } from "@/components/saas/pc-work-badges";

type ChecklistOccurrence = Parameters<typeof ChecklistMyRunsBoard>[0]["occurrences"][number];

function LinkedWorkCard({ item, moduleLabel }: { item: PcWorkItem; moduleLabel: string }) {
  return (
    <article className={`ws-pc-work-card${item.overdue ? " is-overdue" : ""}`}>
      <div className="ws-pc-work-card-main">
        <div className="ws-pc-work-card-head">
          <PcWorkKindBadge kind={item.kind} />
          <PcStatusPill status={item.status} overdue={item.overdue} />
        </div>
        <h3>{item.title}</h3>
        {item.subtitle ? <p className="ws-pc-work-card-sub">{item.subtitle}</p> : null}
        <p className="ws-pc-work-card-due">
          Due {item.dueLabel}
        </p>
      </div>
      <Link href={item.href} className="btn-primary btn-sm ws-sf-btn-primary ws-pc-work-card-btn">
        Open in {moduleLabel}
      </Link>
    </article>
  );
}

function SectionShell({
  icon: Icon,
  title,
  count,
  lead,
  children,
  tone,
}: {
  icon: typeof CheckSquare;
  title: string;
  count: number;
  lead: string;
  children: ReactNode;
  tone: "pc" | "ea" | "fms";
}) {
  return (
    <section className={`ws-sf-list-view ws-pc-section ws-pc-section-${tone}`}>
      <header className="ws-sf-list-view-header ws-pc-section-header">
        <div className="ws-sf-list-view-title ws-pc-section-title-row">
          <div className="ws-pc-section-icon" aria-hidden>
            <Icon size={18} />
          </div>
          <h2>{title}</h2>
          <span className="ws-sf-list-view-count">{count}</span>
        </div>
        <p className="ws-em-section-lead">{lead}</p>
      </header>
      {children}
    </section>
  );
}

export function PcMyTasksBoard({
  checklists,
  eaTasks,
  fmsSteps,
}: {
  checklists: ChecklistOccurrence[];
  eaTasks: PcWorkItem[];
  fmsSteps: PcWorkItem[];
}) {
  const total = checklists.length + eaTasks.length + fmsSteps.length;
  const overdue =
    checklists.filter((row) => row.status === "OVERDUE").length +
    eaTasks.filter((row) => row.overdue).length +
    fmsSteps.filter((row) => row.overdue).length;

  if (total === 0) {
    return (
      <div className="ws-empty-state ws-fms-empty-state is-positive ws-pc-all-clear">
        <CheckSquare size={28} aria-hidden />
        <h3>All clear</h3>
        <p>PC will remind you when checklist, EA, or FMS work is due.</p>
      </div>
    );
  }

  return (
    <div className="ws-pc-my-tasks">
      <div className="ws-sf-metrics ws-pc-metrics">
        <div className={`ws-sf-metric-tile${overdue > 0 ? " is-active" : ""}`}>
          <span>Overdue</span>
          <strong className={overdue > 0 ? "is-late" : undefined}>{overdue}</strong>
          <span className="ws-stat-card-hint">Needs attention</span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>Total pending</span>
          <strong>{total}</strong>
          <span className="ws-stat-card-hint">Across PC, EA, FMS</span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>PC checklist</span>
          <strong>{checklists.length}</strong>
          <span className="ws-stat-card-hint">Recurring items</span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>EA + FMS</span>
          <strong>{eaTasks.length + fmsSteps.length}</strong>
          <span className="ws-stat-card-hint">Linked modules</span>
        </div>
      </div>

      <SectionShell
        count={checklists.length}
        icon={CheckSquare}
        lead="Complete recurring items here. Use voice or type for proof notes."
        title="My PC checklist"
        tone="pc"
      >
        {checklists.length === 0 ? (
          <p className="ws-pc-section-empty">No checklist items due. You are on track.</p>
        ) : (
          <ChecklistMyRunsBoard occurrences={checklists} />
        )}
      </SectionShell>

      {(eaTasks.length > 0 || fmsSteps.length > 0) && (
        <div className="ws-pc-linked-sections">
          {eaTasks.length > 0 ? (
            <SectionShell
              count={eaTasks.length}
              icon={ListTodo}
              lead="Open in Tasks to complete. PC tracks on-time delivery."
              title="EA tasks"
              tone="ea"
            >
              <div className="ws-pc-linked-work-list">
                {eaTasks.map((task) => (
                  <LinkedWorkCard key={task.id} item={task} moduleLabel="Tasks" />
                ))}
              </div>
            </SectionShell>
          ) : null}

          {fmsSteps.length > 0 ? (
            <SectionShell
              count={fmsSteps.length}
              icon={GitBranch}
              lead="Open in FMS to complete your workflow step."
              title="FMS steps"
              tone="fms"
            >
              <div className="ws-pc-linked-work-list">
                {fmsSteps.map((step) => (
                  <LinkedWorkCard key={step.id} item={step} moduleLabel="FMS" />
                ))}
              </div>
            </SectionShell>
          ) : null}
        </div>
      )}
    </div>
  );
}
