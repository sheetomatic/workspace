"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  checklistInitialState,
  completeChecklistOccurrenceAction,
} from "@/app/app/checklists/actions";
import { CHECKLIST_FREQUENCY_LABELS, CHECKLIST_TEAM_LABELS } from "@/lib/checklists/constants";
import { AiVoiceTextarea } from "@/components/saas/ai-voice-textarea";

type Occurrence = {
  id: string;
  plannedAt: Date;
  status: string;
  notes: string | null;
  template: {
    title: string;
    instructions: string | null;
    team: string;
    frequency: string;
  };
};

function formatDue(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function OccurrenceCard({ occurrence }: { occurrence: Occurrence }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    completeChecklistOccurrenceAction,
    checklistInitialState,
  );

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [state.ok, router]);

  const overdue = occurrence.status === "OVERDUE";

  return (
    <article className={`ws-sf-card ws-checklist-run-card${overdue ? " is-overdue" : ""}`}>
      <header>
        <span className="ws-checklist-run-team">
          {CHECKLIST_TEAM_LABELS[occurrence.template.team] ?? occurrence.template.team}
        </span>
        <h3>{occurrence.template.title}</h3>
        <p className="ws-checklist-run-meta">
          {CHECKLIST_FREQUENCY_LABELS[
            occurrence.template.frequency as keyof typeof CHECKLIST_FREQUENCY_LABELS
          ] ?? occurrence.template.frequency}{" "}
          - Due {formatDue(occurrence.plannedAt)}
          {overdue ? <strong className="is-late"> - Overdue</strong> : null}
        </p>
      </header>

      {occurrence.template.instructions ? (
        <p className="ws-fms-muted">{occurrence.template.instructions}</p>
      ) : null}

      <form action={formAction} className="ws-checklist-complete-form">
        <input name="occurrenceId" type="hidden" value={occurrence.id} />
        <AiVoiceTextarea
          defaultValue={occurrence.notes ?? ""}
          name="notes"
          placeholder="Proof or remarks - type or use Voice"
        />
        <button className="btn-primary btn-sm ws-sf-btn-primary" disabled={pending} type="submit">
          {pending ? "Saving..." : "Mark done"}
        </button>
        {state.message ? (
          <p className={state.ok ? "ws-form-success" : "ws-form-error"}>{state.message}</p>
        ) : null}
      </form>
    </article>
  );
}

export function ChecklistMyRunsBoard({
  occurrences,
}: {
  occurrences: Occurrence[];
}) {
  if (occurrences.length === 0) {
    return (
      <div className="ws-empty-state ws-fms-empty-state is-positive">
        <p>No pending checklist items. You are on track.</p>
      </div>
    );
  }

  return (
    <div className="ws-checklist-runs-grid">
      {occurrences.map((occurrence) => (
        <OccurrenceCard key={occurrence.id} occurrence={occurrence} />
      ))}
    </div>
  );
}
