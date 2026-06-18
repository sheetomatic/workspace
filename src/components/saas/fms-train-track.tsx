import type { FmsStepStatus } from "@prisma/client";
import {
  computeStepUrgency,
  formatDelayLabel,
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

function stepDelayStatus(stop: TrainTrackStop): {
  label: string;
  tone: "ok" | "late" | "neutral" | "skipped";
} | null {
  if (stop.status === "SKIPPED") {
    return { label: "Skipped", tone: "skipped" };
  }

  if (stop.status === "PENDING") {
    return { label: "Waiting", tone: "neutral" };
  }

  const delay = liveDelayMinutes(
    stop.plannedAt ?? null,
    stop.actualAt ?? null,
    stop.delayMinutes ?? null,
  );
  const delayLabel = formatDelayLabel(delay);

  if (delayLabel) {
    return { label: delayLabel, tone: "late" };
  }

  if (stop.status === "IN_PROGRESS") {
    return stop.plannedAt
      ? { label: "On track", tone: "ok" }
      : { label: "In progress", tone: "neutral" };
  }

  if (stop.status === "DONE") {
    return { label: "On time", tone: "ok" };
  }

  return null;
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
          const delayStatus = stepDelayStatus(stop);

          return (
            <div
              key={stop.id}
              className={`ws-fms-train-stop ${stateClass}${urgency === "overdue" ? " ws-fms-urgency-overdue" : ""}`}
              role="listitem"
            >
              <div className="ws-fms-train-segment" aria-hidden />
              <div className="ws-fms-train-stop-marker">
                {isCurrent ? (
                  <span
                    className={`ws-fms-train-stop-indicator is-stuck${urgency === "overdue" ? " is-overdue" : ""}`}
                    aria-label="Stopped here"
                  />
                ) : stop.status === "DONE" ? (
                  <span className="ws-fms-train-check" aria-hidden>
                    OK
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
                {showOwner ? (
                  <span className="ws-fms-train-stop-doer">
                    Doer: {stop.ownerName ?? "Unassigned"}
                  </span>
                ) : null}
                {delayStatus ? (
                  <span
                    className={`ws-fms-train-delay-badge is-${delayStatus.tone}`}
                  >
                    {delayStatus.label}
                  </span>
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
