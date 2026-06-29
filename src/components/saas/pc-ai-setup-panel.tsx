"use client";

import Link from "next/link";
import { PC_AI_STARTERS } from "@/lib/checklists/ai-starters";
import { SheetomaticAiMark } from "@/components/saas/sheetomatic-ai-mark";

export function PcAiSetupPanel({ canConfigure }: { canConfigure: boolean }) {
  const featured = PC_AI_STARTERS.slice(0, 6);

  return (
    <section
      className="ws-sf-card ws-fms-ai-setup-hero ws-fms-ai-setup-panel ws-pc-ai-setup-panel"
      aria-label="AI PC builder"
    >
      <div className="ws-fms-ai-setup-hero-head">
        <div className="ws-fms-ai-setup-hero-mark">
          <SheetomaticAiMark variant="icon" sizes="lg" />
        </div>
        <div className="ws-fms-ai-setup-hero-copy">
          <h2>Build checklists with AI</h2>
          <p>
            Recurring compliance by team - GST, HR, maintenance, quality, store.
            AI suggests schedule, doer role, proof, and email reminders. PC then
            monitors on-time completion across EA tasks and FMS steps too.
          </p>
        </div>
        <div className="ws-fms-ai-setup-hero-action">
          {canConfigure ? (
            <Link href="/app/checklists/new" className="btn-cta btn-primary ws-sf-btn-primary">
              <SheetomaticAiMark variant="icon" sizes="sm" className="ws-fms-ai-btn-mark" />
              New AI checklist
            </Link>
          ) : (
            <Link href="/app/tasks/create" className="btn-cta btn-primary ws-sf-btn-primary">
              Assign task (EA)
            </Link>
          )}
        </div>
      </div>
      <ul className="ws-fms-ai-starter-grid is-compact">
        {featured.map((starter) => (
          <li key={starter.id}>
            <Link
              href={
                canConfigure
                  ? `/app/checklists/new?starter=${starter.id}`
                  : "/app/checklists/setup"
              }
              className="ws-fms-ai-starter-card"
            >
              <strong>{starter.label}</strong>
              <span>{starter.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
