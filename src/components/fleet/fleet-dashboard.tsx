"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { FleetBoard } from "@/lib/fleet/board-types";

const TONE: Record<FleetBoard["vehicles"][number]["tone"], string> = {
  moving: "#1f7a3a",
  idle: "#9a6b00",
  alert: "#b42318",
  offline: "#8a8a8a",
};

export function FleetDashboard({ initial }: { initial: FleetBoard }) {
  const [board, setBoard] = useState(initial);
  const [tier, setTier] = useState<"ALL" | "CRITICAL" | "WARNING" | "INFO">("CRITICAL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refresh();
    }, 20000);
    return () => window.clearInterval(timer);
  }, []);

  async function refresh() {
    const response = await fetch("/api/fleet/board");
    if (response.ok) setBoard((await response.json()) as FleetBoard);
  }

  async function loadSample() {
    setBusy(true);
    setNote("");
    const response = await fetch("/api/fleet/demo", { method: "POST" });
    setBusy(false);
    if (!response.ok) {
      setNote("Sample yard did not load.");
      return;
    }
    await refresh();
  }

  async function resolve(alertId: string) {
    const response = await fetch("/api/fleet/alerts/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId }),
    });
    if (response.ok) await refresh();
  }

  async function escalate(alertId: string, text: string) {
    const response = await fetch("/api/fleet/alerts/escalate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId }),
    });
    if (!response.ok) return;
    try {
      await navigator.clipboard.writeText(text);
      setNote("WhatsApp text copied.");
    } catch {
      setNote(text);
    }
    await refresh();
  }

  const alerts = board.alerts.filter((alert) => tier === "ALL" || alert.priority === tier);
  const selected = board.vehicles.find((vehicle) => vehicle.id === selectedId) ?? null;
  const chart = board.trips
    .filter((trip) => trip.ashTonnes != null && trip.status === "COMPLETED")
    .slice(0, 6)
    .map((trip) => ({
      name: trip.registrationNumber.slice(-4),
      tonnes: Math.round((trip.ashTonnes ?? 0) * 10) / 10,
    }));

  return (
    <div className="fleet-yard">
      <header className="fleet-hero">
        <div>
          <p className="fleet-kicker">Ash yard</p>
          <h1>{board.headline}</h1>
          <p>{board.line}</p>
        </div>
        <div className="fleet-hero-actions">
          <Link href="/app/fleet/driver">Driver sync</Link>
          {board.empty ? (
            <button type="button" onClick={() => void loadSample()} disabled={busy}>
              {busy ? "Loading…" : "Load sample yard"}
            </button>
          ) : null}
        </div>
      </header>
      {note ? <p className="fleet-note">{note}</p> : null}

      <section className="fleet-kpis" aria-label="Yard numbers">
        <Kpi label="Active dumpers" value={board.kpis.activeDumpers} />
        <Kpi label="Queued at silo" value={board.kpis.queuedAtSilo} />
        <Kpi label="Dumping" value={board.kpis.dumping} />
        <Kpi label="Idling" value={board.kpis.idle} />
        <Kpi label="Breakdown" value={board.kpis.breakdown} warn={board.kpis.breakdown > 0} />
        <Kpi label="Ash today" value={`${board.kpis.ashTonnesToday} t`} />
        <Kpi label="Fuel stolen" value={`${board.kpis.fuelStolenLiters} L`} warn={board.kpis.fuelStolenLiters > 0} />
      </section>

      <div className="fleet-split">
        <section className="fleet-map-card">
          <div className="fleet-card-head">
            <h2>Live yard</h2>
            <ul className="fleet-legend">
              <li><i style={{ background: TONE.moving }} /> Moving</li>
              <li><i style={{ background: TONE.idle }} /> Queue / idle</li>
              <li><i style={{ background: TONE.alert }} /> Alert</li>
              <li><i style={{ background: TONE.offline }} /> Dead zone</li>
            </ul>
          </div>
          <YardMap board={board} selectedId={selectedId} onSelect={setSelectedId} />
          {selected ? (
            <p className="fleet-selected">
              {selected.registrationNumber} · {selected.engineState ?? selected.status} ·{" "}
              {selected.speedKmh ?? "—"} km/h · fuel {selected.fuelLevelLiters ?? "—"} L
              {selected.distanceToSiloM != null ? ` · ${selected.distanceToSiloM} m from silo` : ""}
              {selected.queueMinutes != null ? ` · queue ${selected.queueMinutes} min` : ""}
            </p>
          ) : (
            <p className="fleet-selected">Tap a dumper.</p>
          )}
          {chart.length > 0 ? (
            <div className="fleet-chart">
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={chart}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} width={32} />
                  <Bar dataKey="tonnes" fill="#1d1d1f" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </section>

        <section className="fleet-alerts">
          <div className="fleet-card-head">
            <h2>Needs a person</h2>
            <div className="fleet-filters">
              {(["CRITICAL", "WARNING", "INFO", "ALL"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={tier === item ? "is-on" : ""}
                  onClick={() => setTier(item)}
                >
                  {item === "ALL" ? "All" : item[0] + item.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          {alerts.length === 0 ? <p className="fleet-quiet">Nothing in this tier.</p> : null}
          <ul>
            {alerts.map((alert) => (
              <li key={alert.id} className={`fleet-alert is-${alert.priority.toLowerCase()}`}>
                <div>
                  <strong>{alert.headline}</strong>
                  <span>{alert.detail}</span>
                </div>
                <div className="fleet-alert-actions">
                  <button type="button" onClick={() => void escalate(alert.id, alert.escalation)}>
                    {alert.escalatedAt ? "Copy again" : "WhatsApp"}
                  </button>
                  <button type="button" onClick={() => void resolve(alert.id)}>
                    Done
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="fleet-trips">
        <h2>Weighbridge vs GPS</h2>
        <div className="fleet-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Dumper</th>
                <th>Gross kg</th>
                <th>Tare kg</th>
                <th>Ash t</th>
                <th>GPS</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {board.trips.length === 0 ? (
                <tr>
                  <td colSpan={6}>No trips yet.</td>
                </tr>
              ) : (
                board.trips.map((trip) => (
                  <tr key={trip.id} className={trip.gpsProof === "No dyke track" ? "is-ghost" : ""}>
                    <td>{trip.registrationNumber}</td>
                    <td>{trip.grossWeightKg ?? "—"}</td>
                    <td>{trip.tareWeightKg ?? "—"}</td>
                    <td>{trip.ashTonnes ?? "—"}</td>
                    <td>{trip.gpsProof}</td>
                    <td>{trip.status.replaceAll("_", " ")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <article className={warn ? "fleet-kpi is-warn" : "fleet-kpi"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function YardMap({
  board,
  selectedId,
  onSelect,
}: {
  board: FleetBoard;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const projected = useMemo(() => projectBoard(board), [board]);
  return (
    <svg viewBox="0 0 100 70" className="fleet-svg" role="img" aria-label="Dumper positions">
      {projected.fences.map((fence) => (
        <polygon
          key={fence.id}
          points={fence.points}
          className={`fleet-fence is-${fence.type.toLowerCase()}`}
        />
      ))}
      {projected.vehicles.map((vehicle) => (
        <g key={vehicle.id} onClick={() => onSelect(vehicle.id)} className="fleet-marker">
          <circle
            cx={vehicle.x}
            cy={vehicle.y}
            r={selectedId === vehicle.id ? 2.2 : 1.5}
            fill={TONE[vehicle.tone]}
          />
          <text x={vehicle.x + 1.6} y={vehicle.y + 0.6}>
            {vehicle.registrationNumber.slice(-4)}
          </text>
        </g>
      ))}
    </svg>
  );
}

function projectBoard(board: FleetBoard) {
  const coords: Array<[number, number]> = [];
  for (const fence of board.geofences) coords.push(...fence.ring);
  for (const vehicle of board.vehicles) {
    if (vehicle.longitude != null && vehicle.latitude != null) {
      coords.push([vehicle.longitude, vehicle.latitude]);
    }
  }
  if (coords.length === 0) {
    return { fences: [], vehicles: [] };
  }
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  const padLng = (maxLng - minLng || 0.01) * 0.08;
  const padLat = (maxLat - minLat || 0.01) * 0.08;
  minLng -= padLng;
  maxLng += padLng;
  minLat -= padLat;
  maxLat += padLat;
  const xOf = (lng: number) => ((lng - minLng) / (maxLng - minLng)) * 100;
  const yOf = (lat: number) => ((maxLat - lat) / (maxLat - minLat)) * 70;
  return {
    fences: board.geofences.map((fence) => ({
      id: fence.id,
      type: fence.type,
      points: fence.ring.map(([lng, lat]) => `${xOf(lng)},${yOf(lat)}`).join(" "),
    })),
    vehicles: board.vehicles.flatMap((vehicle) => {
      if (vehicle.longitude == null || vehicle.latitude == null) return [];
      return [
        {
          id: vehicle.id,
          registrationNumber: vehicle.registrationNumber,
          tone: vehicle.tone,
          x: xOf(vehicle.longitude),
          y: yOf(vehicle.latitude),
        },
      ];
    }),
  };
}
