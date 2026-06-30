"use client";

import Link from "next/link";
import { GitBranch, ListTodo } from "lucide-react";
import type { PcWorkItem } from "@/lib/checklists/pc-work";
import { PcStatusPill, PcWorkKindBadge } from "@/components/saas/pc-work-badges";

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
        <p className="ws-pc-work-card-due">Due {item.dueLabel}</p>
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
  icon: typeof ListTodo;
  title: string;
  count: number;
  lead: string;
  children: React.ReactNode;
  tone: "ea" | "fms";
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

export function PcFollowupsBoard({
  eaTasks,
  fmsSteps,
  scopeLabel,
}: {
  eaTasks: PcWorkItem[];
  fmsSteps: PcWorkItem[];
  scopeLabel: "Today" | "All";
}) {
  const total = eaTasks.length + fmsSteps.length;
  const overdue =
    eaTasks.filter((row) => row.overdue).length +
    fmsSteps.filter((row) => row.overdue).length;

  if (total === 0) {
    return (
      <div className="ws-empty-state ws-fms-empty-state is-positive ws-pc-all-clear">
        <ListTodo size={28} aria-hidden />
        <h3>All clear for {scopeLabel.toLowerCase()}</h3>
        <p>PC tracks EA task follow-ups and FMS pipeline stops here — not checklist SOPs.</p>
      </div>
    );
  }

  return (
    <div className="ws-pc-my-tasks">
      <div className="ws-sf-metrics ws-pc-metrics">
        <div className={`ws-sf-metric-tile${overdue > 0 ? " is-active" : ""}`}>
          <span>Overdue</span>
          <strong className={overdue > 0 ? "is-late" : undefined}>{overdue}</strong>
          <span className="ws-stat-card-hint">Chase first</span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>EA tasks</span>
          <strong>{eaTasks.length}</strong>
          <span className="ws-stat-card-hint">Delegated follow-ups</span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>FMS steps</span>
          <strong>{fmsSteps.length}</strong>
          <span className="ws-stat-card-hint">Pipeline stops</span>
        </div>
      </div>

      <div className="ws-pc-linked-sections">
        {eaTasks.length > 0 ? (
          <SectionShell
            count={eaTasks.length}
            icon={ListTodo}
            lead="Open delegated tasks and chase proof of completion."
            title="EA task follow-ups"
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
            lead="Open workflow stops and clear delays before EM."
            title="FMS follow-ups"
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
    </div>
  );
}
