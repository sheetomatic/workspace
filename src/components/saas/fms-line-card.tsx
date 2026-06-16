import Link from "next/link";
import type { FmsInstanceStatus } from "@prisma/client";
import { FmsTrainTrack, type TrainTrackStop } from "@/components/saas/fms-train-track";
import { FmsStatusBadge } from "@/components/saas/fms-status-badge";
import { MisScoreBadge } from "@/components/saas/mis-score-badge";
import { fmsJobMisScore } from "@/lib/mis/score";
import {
  formatDelayLabel,
  isStepOverdue,
  liveDelayMinutes,
} from "@/lib/fms/step-display";

type StepState = {
  id: string;
  status: TrainTrackStop["status"];
  plannedAt: Date | null;
  actualAt: Date | null;
  delayMinutes: number | null;
  step: { stepName: string };
  owner: { name: string | null; email: string } | null;
};

export function FmsLineCard({
  instanceId,
  title,
  workflowName,
  status,
  stepStates,
  href,
}: {
  instanceId: string;
  title: string;
  workflowName: string;
  status: FmsInstanceStatus;
  stepStates: StepState[];
  href?: string;
}) {
  const current = stepStates.find((s) => s.status === "IN_PROGRESS");
  const doneCount = stepStates.filter((s) => s.status === "DONE").length;
  const misScore = fmsJobMisScore(stepStates);
  const linkHref = href ?? `/app/fms/instances/${instanceId}`;

  const delay = current
    ? liveDelayMinutes(current.plannedAt, current.actualAt, current.delayMinutes)
    : null;
  const delayLabel = formatDelayLabel(delay);
  const overdue = current
    ? isStepOverdue(
        current.status,
        current.plannedAt,
        current.actualAt,
        current.delayMinutes,
      )
    : false;

  const stops: TrainTrackStop[] = stepStates.map((s) => ({
    id: s.id,
    name: s.step.stepName,
    status: s.status,
    plannedAt: s.plannedAt,
    actualAt: s.actualAt,
    delayMinutes: s.delayMinutes,
    ownerName: s.owner?.name ?? s.owner?.email.split("@")[0] ?? null,
  }));

  return (
    <article className={`ws-fms-line-card${overdue ? " is-overdue" : ""}`}>
      <header className="ws-fms-line-card-header">
        <div>
          <Link href={linkHref} className="ws-fms-line-card-title">
            {title}
          </Link>
          <p className="ws-fms-muted">
            {workflowName} | {doneCount}/{stepStates.length} stops passed
          </p>
        </div>
        <div className="ws-fms-line-card-badges">
          <MisScoreBadge score={misScore} compact />
          <FmsStatusBadge status={status} />
          {overdue && delayLabel ? (
            <span className="ws-sf-badge ws-sf-badge-danger">{delayLabel}</span>
          ) : null}
        </div>
      </header>

      <FmsTrainTrack stops={stops} compact showOwner />

      {current ? (
        <footer className="ws-fms-line-card-footer">
          <span>
            Now at: <strong>{current.step.stepName}</strong>
          </span>
          {current.owner ? (
            <span className="ws-fms-muted">
              Owner: {current.owner.name ?? current.owner.email.split("@")[0]}
            </span>
          ) : null}
        </footer>
      ) : status === "COMPLETED" ? (
        <footer className="ws-fms-line-card-footer">
          <span className="ws-fms-muted">Journey complete - reached destination</span>
        </footer>
      ) : null}
    </article>
  );
}
