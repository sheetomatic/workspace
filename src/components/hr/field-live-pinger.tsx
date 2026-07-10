"use client";

import { useEffect, useRef, useState } from "react";

const PING_INTERVAL_MS = 45_000;

/**
 * While the Field page is open, periodically posts GPS pings via
 * POST /api/hr/field/ping (30s server rate limit).
 * Label: “Live while app open” — not background tracking.
 */
export function FieldLivePinger({ enabled }: { enabled: boolean }) {
  const [status, setStatus] = useState<"idle" | "live" | "denied" | "error">(
    "idle",
  );
  const [lastAt, setLastAt] = useState<Date | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("denied");
      return;
    }

    let cancelled = false;

    async function sendPing(lat: number, lng: number, accuracyM?: number) {
      if (inFlight.current || cancelled) return;
      inFlight.current = true;
      try {
        const res = await fetch("/api/hr/field/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            geoLat: lat,
            geoLng: lng,
            ...(accuracyM != null && Number.isFinite(accuracyM)
              ? { accuracyM }
              : {}),
          }),
        });
        if (cancelled) return;
        if (res.ok) {
          setStatus("live");
          setLastAt(new Date());
        } else if (res.status === 429) {
          setStatus((prev) => (prev === "live" ? "live" : "idle"));
        } else {
          setStatus("error");
        }
      } catch {
        if (!cancelled) setStatus("error");
      } finally {
        inFlight.current = false;
      }
    }

    function readAndPing() {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          void sendPing(
            pos.coords.latitude,
            pos.coords.longitude,
            pos.coords.accuracy,
          );
        },
        () => {
          if (!cancelled) setStatus("denied");
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10_000 },
      );
    }

    readAndPing();
    const timer = window.setInterval(readAndPing, PING_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="ws-hr-live-pinger" role="status" aria-live="polite">
      <span
        className={
          status === "live" ? "ws-hr-live-dot is-live" : "ws-hr-live-dot"
        }
        aria-hidden
      />
      <div>
        <strong>Live while app open</strong>
        <p className="ws-hr-help">
          {status === "live" && lastAt
            ? `Sharing location every ~45s. Last ping ${lastAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}.`
            : status === "denied"
              ? "Location permission needed to share live GPS while this page is open."
              : status === "error"
                ? "Could not send location ping. Keep this page open and allow GPS."
                : "Starting live location share…"}
        </p>
      </div>
    </div>
  );
}
