"use client";

import type { FmsStepStatus } from "@prisma/client";
import { TrainFront } from "lucide-react";

export type RouteSnapshotStop = {
  id: string;
  status: FmsStepStatus;
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
) {
  if (from === "start" || from === "DONE") {
    if (to === "DONE") {
      return "is-done";
    }
    if (to === "IN_PROGRESS" || toCurrent) {
      return "is-active";
    }
    return "is-done";
  }
  if (from === "IN_PROGRESS") {
    return "is-pending";
  }
  return "is-pending";
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
  const allDone =
    stops.length > 0 && stops.every((stop) => stop.status === "DONE");

  return (
    <button
      type="button"
      className={`ws-fms-route-snapshot${expanded ? " is-expanded" : ""}`}
      aria-expanded={expanded}
      aria-label={`${label}. Click to ${expanded ? "hide" : "show"} row details.`}
      onClick={onToggle}
    >
      <span className="ws-fms-route-snapshot-label">Start</span>
      {stops.map((stop, index) => {
        const isCurrent = stop.status === "IN_PROGRESS";
        const prevStatus = index === 0 ? "start" : stops[index - 1]!.status;
        return (
          <span key={stop.id} className="ws-fms-route-snapshot-segment">
            <span
              className={`ws-fms-route-snapshot-wire ${wireClass(prevStatus, stop.status, isCurrent)}`}
              aria-hidden
            />
            {isCurrent ? (
              <TrainFront
                size={14}
                className="ws-fms-route-snapshot-train"
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
      <span className="ws-fms-route-snapshot-chevron" aria-hidden>
        {expanded ? "Hide" : "Details"}
      </span>
    </button>
  );
}
