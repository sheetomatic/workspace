"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  recordCheckInAction,
  recordCheckOutAction,
} from "@/lib/hr/hr-actions";
import { HR_OUT_OF_LOCATION_MESSAGE } from "@/lib/hr/hr-result";
import { GeoPunchForm } from "@/components/hr/geo-punch-form";

export type PunchState = "not_started" | "clocked_in" | "completed";

export function getPunchState(
  checkInAt: Date | null | undefined,
  checkOutAt: Date | null | undefined,
): PunchState {
  if (!checkInAt) {
    return "not_started";
  }
  if (!checkOutAt) {
    return "clocked_in";
  }
  return "completed";
}

function formatTime(value: Date | null | undefined) {
  if (!value) {
    return null;
  }
  return value.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AttendancePunchPanel({
  checkInAt,
  checkOutAt,
  geoFenceOk,
  method,
  todayLabel,
  geoFenceRequired = false,
  sites = [],
}: {
  checkInAt: Date | null;
  checkOutAt: Date | null;
  geoFenceOk: boolean | null;
  method: string | null;
  todayLabel: string;
  geoFenceRequired?: boolean;
  sites?: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const punchState = getPunchState(checkInAt, checkOutAt);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function runCheckOut() {
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      try {
        await recordCheckOutAction();
        setMessage("Checked out successfully.");
        router.refresh();
      } catch {
        setMessage("Check in first before checking out.");
        setIsError(true);
      }
    });
  }

  const statusLabel =
    punchState === "not_started"
      ? "Not clocked in"
      : punchState === "clocked_in"
        ? `Clocked in at ${formatTime(checkInAt)}`
        : `Day complete - In ${formatTime(checkInAt)} | Out ${formatTime(checkOutAt)}`;

  return (
    <section className="ws-attendance-punch-panel">
      <div className="ws-attendance-punch-head">
        <div>
          <p className="ws-attendance-punch-date">{todayLabel}</p>
          <p className={`ws-attendance-punch-status status-${punchState}`}>
            {statusLabel}
          </p>
        </div>
        {method ? (
          <span className="ws-attendance-punch-method">{method}</span>
        ) : null}
      </div>

      <div className="ws-attendance-punch-actions">
        {!geoFenceRequired && punchState === "not_started" ? (
          <button
            type="button"
            className="btn-cta btn-primary ws-attendance-punch-btn"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                setMessage(null);
                setIsError(false);
                const result = await recordCheckInAction(new FormData());
                if (!result.ok) {
                  setMessage(
                    result.code === "OUT_OF_LOCATION"
                      ? HR_OUT_OF_LOCATION_MESSAGE
                      : result.message,
                  );
                  setIsError(true);
                  return;
                }
                setMessage("Checked in successfully.");
                router.refresh();
              });
            }}
          >
            {pending ? "Checking in..." : "Check in"}
          </button>
        ) : null}
        <button
          type="button"
          className="btn-cta btn-secondary ws-attendance-punch-btn"
          disabled={punchState !== "clocked_in" || pending}
          onClick={runCheckOut}
        >
          {pending && punchState === "clocked_in" ? "Checking out..." : "Check out"}
        </button>
      </div>

      {punchState === "clocked_in" && geoFenceOk === false ? (
        <p className="ws-hr-feedback ws-hr-feedback-error">
          {HR_OUT_OF_LOCATION_MESSAGE}
        </p>
      ) : null}

      {punchState === "completed" ? (
        <p className="ws-hr-meta">
          Both punches recorded for today. Buttons stay disabled until tomorrow.
        </p>
      ) : null}

      {message ? (
        <p className={isError ? "ws-hr-feedback ws-hr-feedback-error" : "ws-hr-feedback"}>
          {message}
        </p>
      ) : null}

      {punchState === "not_started" ? (
        <div className="ws-attendance-punch-geo">
          <p className="ws-hr-help">
            {geoFenceRequired
              ? "GPS check-in is required. You must be inside the office geo-fence."
              : "Optional: capture GPS for geo-fenced office check-in."}
          </p>
          <GeoPunchForm
            action={recordCheckInAction}
            requireGeo={geoFenceRequired}
            sites={sites}
            submitLabel="Check in with GPS"
            successMessage="Checked in successfully."
          />
        </div>
      ) : null}
    </section>
  );
}
