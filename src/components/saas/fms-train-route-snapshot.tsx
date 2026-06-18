"use client";

import type { FmsStepStatus } from "@prisma/client";
import {
  formatDelayLabel,
  isStepOverdue,
  liveDelayMinutes,
} from "@/lib/fms/step-display";

export type RouteSnapshotStop = {
  id: string;
  status: FmsStepStatus;
  plannedAt?: Date | null;
  actualAt?: Date | null;
  delayMinutes?: number | null;
};

function stopDotClass(status: FmsStepStatus, isCurrent: boolean) {
  if (isCurrent) {
    return "is-current";
  }
  if (status === "DONE") {
    return "is-done";
  }
  if (status === "SKIPPED") {
    return "is-skipped";
  }
  return "is-pending";
}

function wireClass(
  from: "start" | FmsStepStatus,
  to: FmsStepStatus,
  toCurrent: boolean,
  toOverdue: boolean,
) {
  if (from === "start" || from === "DONE") {
    if (to === "DONE") {
      return "is-done";
    }
    if (to === "IN_PROGRESS" || toCurrent) {
      return toOverdue ? "is-stuck" : "is-active";
    }
    return "is-done";
  }
  if (from === "IN_PROGRESS") {
    return "is-stuck";
  }
  return "is-pending";
}

function stopTiming(stop: RouteSnapshotStop) {
  const plannedAt = stop.plannedAt ?? null;
  const actualAt = stop.actualAt ?? null;
  const delayMinutes = stop.delayMinutes ?? null;
  const overdue = isStepOverdue(
    stop.status,
    plannedAt,
    actualAt,
    delayMinutes,
  );
  const delayLabel = formatDelayLabel(
    liveDelayMinutes(plannedAt, actualAt, delayMinutes),
  );
  return { overdue, delayLabel };
}

export function FmsTrainRouteSnapshot({
  stops,
  expanded,
  onToggle,
  label = "Route snapshot",
}: {
  stops: RouteSnapshotStop[];
  expanded?: boolean;
  onToggle: () => void;
  label?: string;
}) {
  const currentIndex = stops.findIndex((stop) => stop.status === "IN_PROGRESS");
  const currentStop = currentIndex >= 0 ? stops[currentIndex] : null;
  const currentTiming = currentStop ? stopTiming(currentStop) : null;
  const allDone =
    stops.length > 0 && stops.every((stop) => stop.status === "DONE");
  const snapshotClass = [
    "ws-fms-route-snapshot",
    expanded ? "is-expanded" : "",
    currentStop ? "has-stuck-stop" : "",
    currentTiming?.overdue ? "is-overdue" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={snapshotClass}
      aria-expanded={expanded}
      aria-label={`${label}. Click to ${expanded ? "hide" : "show"} row details.`}
      onClick={onToggle}
    >
      <span className="ws-fms-route-snapshot-label">Start</span>
      {stops.map((stop, index) => {
        const isCurrent = stop.status === "IN_PROGRESS";
        const { overdue } = stopTiming(stop);
        const prevStatus = index === 0 ? "start" : stops[index - 1]!.status;
        const prevOverdue =
          index > 0 ? stopTiming(stops[index - 1]!).overdue : false;
        const wireTone = wireClass(
          prevStatus,
          stop.status,
          isCurrent,
          isCurrent ? overdue : prevOverdue,
        );
        return (
          <span key={stop.id} className="ws-fms-route-snapshot-segment">
            <span
              className={`ws-fms-route-snapshot-wire ${wireTone}`}
              aria-hidden
            />
            {isCurrent ? (
              <span
                className={`ws-fms-route-snapshot-indicator is-stuck${overdue ? " is-overdue" : ""}`}
                aria-hidden
              />
            ) : (
              <span
                className={`ws-fms-route-snapshot-dot ${stopDotClass(stop.status, isCurrent)}`}
                aria-hidden
              />
            )}
          </span>
        );
      })}
      {stops.length > 0 ? (
        <span
          className={`ws-fms-route-snapshot-wire ${allDone ? "is-done" : "is-pending"}`}
          aria-hidden
        />
      ) : null}
      <span className="ws-fms-route-snapshot-label">End</span>
      {currentStop ? (
        <span
          className={`ws-fms-route-snapshot-stuck${currentTiming?.overdue ? " is-overdue" : ""}`}
        >
          {currentTiming?.overdue && currentTiming.delayLabel
            ? currentTiming.delayLabel
            : "Stopped here"}
        </span>
      ) : null}
      <span className="ws-fms-route-snapshot-chevron" aria-hidden>
        {expanded ? "Hide" : "Details"}
      </span>
    </button>
  );
}
