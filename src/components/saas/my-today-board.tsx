"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronUp, Plus, Sparkles } from "lucide-react";
import {
  checklistInitialState,
  completeChecklistOccurrenceAction,
} from "@/app/app/checklists/actions";
import { PcWorkKindBadge } from "@/components/saas/pc-work-badges";
import { AiVoiceTextarea } from "@/components/saas/ai-voice-textarea";
import type { MyTodayPayload } from "@/lib/work/my-today";
import {
  todayHeroMessage,
  todayUrgencyLabel,
  type TodayWorkItem,
} from "@/lib/work/today-queue";
import { KRA_KPI_SURFACE_HIDDEN } from "@/lib/pms-surface";

function QuickChecklistDone({ occurrenceId }: { occurrenceId: string }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [state, formAction, pending] = useActionState(
    completeChecklistOccurrenceAction,
    checklistInitialState,
  );

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <div className="ws-today-actions">
      <form action={formAction} className="ws-today-quick-form">
        <input name="occurrenceId" type="hidden" value={occurrenceId} />
        <input name="notes" type="hidden" value="" />
        <button
          className="btn-primary btn-sm ws-today-done-btn"
          disabled={pending}
          type="submit"
        >
          <Check size={16} aria-hidden />
          {pending ? "Saving..." : "Done"}
        </button>
      </form>
      <button
        className="btn-secondary btn-sm"
        type="button"
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        Note
      </button>
      {expanded ? (
        <form action={formAction} className="ws-today-note-form">
          <input name="occurrenceId" type="hidden" value={occurrenceId} />
          <AiVoiceTextarea name="notes" placeholder="Optional proof or remark" />
          <button className="btn-primary btn-sm" disabled={pending} type="submit">
            Save with note
          </button>
        </form>
      ) : null}
      {state.message && !state.ok ? (
        <p className="ws-form-error">{state.message}</p>
      ) : null}
    </div>
  );
}

function TodayRow({ item }: { item: TodayWorkItem }) {
  return (
    <article className={`ws-today-row urgency-${item.urgency}`}>
      <div className="ws-today-row-main">
        <div className="ws-today-row-head">
          <PcWorkKindBadge kind={item.kind} />
          <span className={`ws-today-urgency urgency-${item.urgency}`}>
            {todayUrgencyLabel(item.urgency)}
          </span>
        </div>
        <h3>{item.title}</h3>
        {item.subtitle ? <p className="ws-today-sub">{item.subtitle}</p> : null}
        <p className="ws-today-due">Due {item.dueLabel}</p>
      </div>
      <div className="ws-today-row-action">
        {item.completable && item.occurrenceId ? (
          <QuickChecklistDone occurrenceId={item.occurrenceId} />
        ) : (
          <Link className="btn-primary btn-sm" href={item.href}>
            Open
          </Link>
        )}
      </div>
    </article>
  );
}

export function MyTodayBoard({
  payload,
  canDelegate,
}: {
  payload: MyTodayPayload;
  canDelegate: boolean;
}) {
  const { items, stats } = payload;
  const hero = todayHeroMessage(stats);

  return (
    <div className="ws-today-board">
      <header className="ws-today-hero">
        <div className="ws-today-hero-text">
          <p className="ws-today-eyebrow">
            <Sparkles size={14} aria-hidden />
            My Today
          </p>
          <h2>{hero}</h2>
          <p className="ws-today-hero-lead">
            One list. Top to bottom. Tick and move on - no hunting across modules.
          </p>
        </div>
        {canDelegate ? (
          <Link className="btn-primary ws-today-delegate-btn" href="/app/tasks/create">
            <Plus size={16} aria-hidden />
            Delegate task
          </Link>
        ) : null}
      </header>

      <div className="ws-today-stats">
        <div className="ws-today-stat">
          <span>To do now</span>
          <strong>{stats.total}</strong>
        </div>
        <div className="ws-today-stat positive">
          <span>Done this week</span>
          <strong>{stats.completedThisWeek}</strong>
        </div>
        {KRA_KPI_SURFACE_HIDDEN ? null : (
          <div className="ws-today-stat">
            <span>On-time score</span>
            <strong>{stats.onTimeScore}</strong>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="ws-empty-state ws-fms-empty-state is-positive ws-today-clear">
          <Check size={28} aria-hidden />
          <h3>All clear</h3>
          <p>Nothing needs you right now. You are all caught up.</p>
        </div>
      ) : (
        <ol className="ws-today-list">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <TodayRow item={item} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
