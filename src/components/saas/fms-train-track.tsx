import type { FmsStepStatus } from "@prisma/client";
import { TrainFront } from "lucide-react";
import {
  computeStepUrgency,
  isStepOverdue,
  liveDelayMinutes,
} from "@/lib/fms/step-display";

export type TrainTrackStop = {
  id: string;
  name: string;
  status: FmsStepStatus;
  plannedAt?: Date | null;
  actualAt?: Date | null;
  delayMinutes?: number | null;
  ownerName?: string | null;
};

function stopStateClass(
  stop: TrainTrackStop,
  isCurrent: boolean,
): string {
  const overdue = isStepOverdue(
    stop.status,
    stop.plannedAt ?? null,
    stop.actualAt ?? null,
    stop.delayMinutes ?? null,
  );
  if (stop.status === "DONE") {
    const delay = liveDelayMinutes(
      stop.plannedAt ?? null,
      stop.actualAt ?? null,
      stop.delayMinutes ?? null,
    );
    return delay && delay > 0 ? "is-done-late" : "is-done";
  }
  if (isCurrent || stop.status === "IN_PROGRESS") {
    return overdue ? "is-current is-overdue" : "is-current";
  }
  if (stop.status === "SKIPPED") {
    return "is-skipped";
  }
  return "is-upcoming";
}

type FmsTrainTrackProps = {
  stops: TrainTrackStop[];
  startLabel?: string;
  endLabel?: string;
  compact?: boolean;
  showOwner?: boolean;
};

export function FmsTrainTrack({
  stops,
  startLabel = "Start",
  endLabel = "Finish",
  compact = false,
  showOwner = false,
}: FmsTrainTrackProps) {
  const currentIndex = stops.findIndex((s) => s.status === "IN_PROGRESS");
  const doneCount = stops.filter((s) => s.status === "DONE").length;
  const allDone = doneCount === stops.length && stops.length > 0;

  return (
    <div
      className={`ws-fms-train-track${compact ? " is-compact" : ""}${allDone ? " is-finished" : ""}`}
      role="list"
      aria-label={`Workflow route, stop ${Math.max(currentIndex + 1, doneCount)} of ${stops.length}`}
    >
      <div className="ws-fms-train-origin" aria-hidden>
        <span className="ws-fms-train-station-dot is-origin" />
        <span className="ws-fms-train-station-name">{startLabel}</span>
      </div>

      <div className="ws-fms-train-rail">
        {stops.map((stop, index) => {
          const isCurrent = stop.status === "IN_PROGRESS";
          const stateClass = stopStateClass(stop, isCurrent);
          const urgency =
            isCurrent && stop.plannedAt
              ? computeStepUrgency(stop.status, stop.plannedAt)
              : "normal";

          return (
            <div
              key={stop.id}
              className={`ws-fms-train-stop ${stateClass}${urgency === "overdue" ? " ws-fms-urgency-overdue" : ""}`}
              role="listitem"
            >
              <div className="ws-fms-train-segment" aria-hidden />
              <div className="ws-fms-train-stop-marker">
                {isCurrent ? (
                  <TrainFront
                    size={compact ? 14 : 18}
                    className="ws-fms-train-icon"
                    aria-label="Train is here"
                  />
                ) : stop.status === "DONE" ? (
                  <span className="ws-fms-train-check" aria-hidden>
                    ?
                  </span>
                ) : (
                  <span className="ws-fms-train-stop-num" aria-hidden>
                    {index + 1}
                  </span>
                )}
              </div>
              <div className="ws-fms-train-stop-label">
                <span className="ws-fms-train-stop-name" title={stop.name}>
                  {stop.name}
                </span>
                {showOwner && stop.ownerName ? (
                  <span className="ws-fms-train-stop-owner">{stop.ownerName}</span>
                ) : null}
                {isCurrent ? (
                  <span className="ws-fms-train-now-badge">Stopped here</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="ws-fms-train-destination" aria-hidden>
        <span
          className={`ws-fms-train-station-dot is-destination${allDone ? " is-reached" : ""}`}
        />
        <span className="ws-fms-train-station-name">{endLabel}</span>
      </div>
    </div>
  );
}
