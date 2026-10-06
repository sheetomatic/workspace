"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  enqueueTelemetry,
  readOutbox,
  removeOutbox,
  type OutboxPoint,
} from "@/lib/fleet/offline-queue";

type VehicleOption = { id: string; registrationNumber: string; fuelCapacityLiters: number };

export function FleetDriverClient() {
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [fuel, setFuel] = useState("250");
  const [queued, setQueued] = useState(0);
  const [status, setStatus] = useState("Waiting for a fix.");

  useEffect(() => {
    void fetch("/api/fleet/vehicles")
      .then((response) => response.json())
      .then((body: { vehicles?: VehicleOption[] }) => {
        const list = body.vehicles ?? [];
        setVehicles(list);
        if (list[0]) setVehicleId(list[0].id);
      })
      .catch(() => setStatus("Could not load dumpers."));

    void readOutbox().then((rows) => setQueued(rows.length)).catch(() => undefined);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw-fleet.js").then((registration) => {
        const sync = (registration as ServiceWorkerRegistration & {
          sync?: { register: (tag: string) => Promise<void> };
        }).sync;
        return sync?.register("fleet-telemetry");
      }).catch(() => undefined);
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "fleet-flush") void flush();
      });
    }
    window.addEventListener("online", () => void flush());
  }, []);

  async function capture() {
    if (!vehicleId) {
      setStatus("Pick a dumper first.");
      return;
    }
    const point = await readFix(vehicleId, Number(fuel));
    if (!point) {
      setStatus("GPS is off. Turn location on and try again.");
      return;
    }
    await enqueueTelemetry(point);
    const rows = await readOutbox();
    setQueued(rows.length);
    if (!navigator.onLine) {
      setStatus("No signal. The fix is on this phone.");
      return;
    }
    await flush();
  }

  async function flush() {
    const rows = await readOutbox();
    setQueued(rows.length);
    if (!rows.length) {
      setStatus("Nothing waiting.");
      return;
    }
    try {
      const response = await fetch("/api/telemetry/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: rows }),
      });
      if (!response.ok) {
        setStatus("Sync failed. The queue is still on this phone.");
        return;
      }
      const body = (await response.json()) as { accepted: number; duplicates: number };
      await removeOutbox(rows.map((row) => row.clientEventId));
      setQueued(0);
      setStatus(`Synced ${body.accepted}. Duplicates skipped: ${body.duplicates}.`);
    } catch {
      setStatus("Still offline. Will retry when the radio returns.");
    }
  }

  return (
    <div className="fleet-yard">
      <header className="fleet-hero">
        <div>
          <p className="fleet-kicker">Driver</p>
          <h1>Hold the fix until the signal returns.</h1>
          <p>{queued} waiting on this phone. {status}</p>
        </div>
        <div className="fleet-hero-actions">
          <Link href="/app/fleet">Yard board</Link>
        </div>
      </header>
      <section className="fleet-map-card fleet-driver-form">
        <label>
          Dumper
          <select value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.registrationNumber}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fuel litres
          <input inputMode="decimal" value={fuel} onChange={(event) => setFuel(event.target.value)} />
        </label>
        <button type="button" onClick={() => void capture()}>
          Save fix
        </button>
        <button type="button" onClick={() => void flush()}>
          Sync now
        </button>
      </section>
    </div>
  );
}

async function readFix(vehicleId: string, fuelLevelLiters: number): Promise<OutboxPoint | null> {
  const position = await new Promise<GeolocationPosition | null>((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
  if (!position) return null;
  const speed = position?.coords.speed;
  const speedKmh = speed == null || Number.isNaN(speed) ? 0 : Math.max(0, speed * 3.6);
  return {
    clientEventId: crypto.randomUUID(),
    vehicleId,
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    speedKmh,
    fuelLevelLiters: Number.isFinite(fuelLevelLiters) ? fuelLevelLiters : 0,
    rpm: speedKmh > 5 ? 1500 : 700,
    engineState: speedKmh > 5 ? "MOVING" : "IDLING",
    networkStatus: navigator.onLine ? "ONLINE" : "OFFLINE",
    recordedAt: new Date().toISOString(),
  };
}
