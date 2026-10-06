import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { alertHeadline, escalationText, priorityFor } from "@/lib/fleet/alert-policy";
import type { FleetBoard } from "@/lib/fleet/board-types";
import { haversineMeters, shapeRing } from "@/lib/fleet/geofence";
import { isGeofenceShape, OFFLINE_ALERT_MS, type GeofenceShape, type LngLat } from "@/lib/fleet/types";

export type { FleetBoard };

export async function getFleetBoard(organizationId: string): Promise<FleetBoard> {
  await refreshOfflineAlerts(organizationId);

  const [vehicles, fences, alerts, trips] = await Promise.all([
    prisma.fleetVehicle.findMany({
      where: { organizationId },
      include: { state: true },
      orderBy: { registrationNumber: "asc" },
    }),
    prisma.fleetGeofence.findMany({ where: { organizationId, active: true } }),
    prisma.fleetAlert.findMany({
      where: { organizationId, resolvedAt: null },
      include: { vehicle: { select: { registrationNumber: true } } },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    prisma.fleetTrip.findMany({
      where: { organizationId },
      include: { vehicle: { select: { registrationNumber: true } } },
      orderBy: { startTime: "desc" },
      take: 40,
    }),
  ]);

  const criticalVehicleIds = new Set(
    alerts.filter((a) => a.priority === "CRITICAL").map((a) => a.vehicleId),
  );
  const silo = fences
    .map((f) => ({ type: f.type, shape: f.polygonCoordinates }))
    .find((f) => f.type === "SILO" && isGeofenceShape(f.shape));
  const siloCenter: LngLat | null =
    silo && isGeofenceShape(silo.shape)
      ? silo.shape.kind === "circle"
        ? silo.shape.center
        : centroid(silo.shape.ring)
      : null;

  const now = Date.now();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const ashTonnesToday = trips
    .filter((t) => t.endTime && t.endTime >= startOfDay && t.ashTonnes != null && t.status === "COMPLETED")
    .reduce((sum, t) => sum + (t.ashTonnes ?? 0), 0);

  const thefts = await prisma.fleetAlert.findMany({
    where: {
      organizationId,
      alertType: "FUEL_THEFT",
      createdAt: { gte: startOfDay },
    },
    select: { payload: true },
  });
  const fuelStolenLiters = thefts.reduce((sum, row) => sum + dropLiters(row.payload), 0);

  const mappedVehicles = vehicles.map((vehicle) => {
    const state = vehicle.state;
    const stale =
      !state?.lastRecordedAt || now - state.lastRecordedAt.getTime() > 15 * 60_000;
    const offline = vehicle.status === "OFFLINE" || state?.networkStatus === "OFFLINE" || stale;
    const alert = vehicle.status === "BREAKDOWN" || criticalVehicleIds.has(vehicle.id);
    const slow = (state?.speedKmh ?? 0) < 5;
    const queued = state?.siloEnteredAt != null;
    const dumping = state?.dykeEnteredAt != null;
    let tone: FleetBoard["vehicles"][number]["tone"] = "moving";
    if (alert) tone = "alert";
    else if (offline) tone = "offline";
    else if (queued || dumping || slow || state?.engineState === "IDLING") tone = "idle";

    const here: LngLat | null =
      state?.longitude != null && state.latitude != null
        ? [state.longitude, state.latitude]
        : null;

    return {
      id: vehicle.id,
      registrationNumber: vehicle.registrationNumber,
      vehicleType: vehicle.vehicleType,
      status: vehicle.status,
      tone,
      latitude: state?.latitude ?? null,
      longitude: state?.longitude ?? null,
      speedKmh: state?.speedKmh ?? null,
      fuelLevelLiters: state?.fuelLevelLiters ?? null,
      engineState: state?.engineState ?? null,
      lastRecordedAt: state?.lastRecordedAt?.toISOString() ?? null,
      queueMinutes: minutesSince(state?.siloEnteredAt, now),
      dumpMinutes: minutesSince(state?.dykeEnteredAt, now),
      distanceToSiloM: here && siloCenter ? Math.round(haversineMeters(here, siloCenter)) : null,
    };
  });

  const dumper = vehicles.filter(
    (v) => v.status === "ACTIVE" && (v.vehicleType === "ASH_DUMPER" || v.vehicleType === "DUST_DUMPER"),
  );
  const kpis = {
    activeDumpers: dumper.length,
    queuedAtSilo: mappedVehicles.filter((v) => v.queueMinutes != null).length,
    dumping: mappedVehicles.filter((v) => v.dumpMinutes != null).length,
    idle: vehicles.filter((v) => v.state?.idleSince).length,
    breakdown: new Set([
      ...vehicles.filter((v) => v.status === "BREAKDOWN").map((v) => v.id),
      ...alerts.filter((a) => a.alertType === "BREAKDOWN").map((a) => a.vehicleId),
    ]).size,
    ashTonnesToday: Math.round(ashTonnesToday * 10) / 10,
    fuelStolenLiters: Math.round(fuelStolenLiters * 10) / 10,
  };

  const critical = alerts.filter((a) => a.priority === "CRITICAL");
  const first = critical[0];
  const headline = first
    ? textField(first.payload, "headline") ||
      alertHeadline(first.alertType, first.vehicle.registrationNumber)
    : vehicles.length === 0
      ? "No dumpers on this yard yet"
      : "Yard is quiet";
  const line = first
    ? textField(first.payload, "detail") || "A supervisor needs to act."
    : vehicles.length === 0
      ? "Load the sample yard, or sync the first truck."
      : `${kpis.activeDumpers} dumpers active. Open this before the shift meeting.`;

  return {
    empty: vehicles.length === 0,
    headline,
    line,
    kpis,
    vehicles: mappedVehicles,
    geofences: fences.flatMap((fence) => {
      if (!isGeofenceShape(fence.polygonCoordinates)) return [];
      return [
        {
          id: fence.id,
          name: fence.name,
          type: fence.type,
          ring: shapeRing(fence.polygonCoordinates as GeofenceShape),
        },
      ];
    }),
    alerts: alerts.map((alert) => ({
      id: alert.id,
      vehicleId: alert.vehicleId,
      registrationNumber: alert.vehicle.registrationNumber,
      alertType: alert.alertType,
      priority: alert.priority,
      headline:
        textField(alert.payload, "headline") ||
        alertHeadline(alert.alertType, alert.vehicle.registrationNumber),
      detail: textField(alert.payload, "detail"),
      escalation:
        textField(alert.payload, "escalation") ||
        escalationText({
          type: alert.alertType,
          registration: alert.vehicle.registrationNumber,
          detail: textField(alert.payload, "detail"),
        }),
      createdAt: alert.createdAt.toISOString(),
      escalatedAt: alert.escalatedAt?.toISOString() ?? null,
    })),
    trips: trips.map((trip) => ({
      id: trip.id,
      registrationNumber: trip.vehicle.registrationNumber,
      status: trip.status,
      grossWeightKg: trip.grossWeightKg,
      tareWeightKg: trip.tareWeightKg,
      ashTonnes: trip.ashTonnes,
      dykeFixCount: trip.dykeFixCount,
      gpsProof:
        trip.status === "GHOST" || (trip.tareWeightKg != null && trip.dykeFixCount === 0)
          ? "No dyke track"
          : trip.tareWeightKg == null
            ? "Open"
            : "Dyke track",
      startTime: trip.startTime.toISOString(),
      endTime: trip.endTime?.toISOString() ?? null,
    })),
  };
}

export async function resolveFleetAlert(organizationId: string, alertId: string) {
  const alert = await prisma.fleetAlert.findFirst({
    where: { id: alertId, organizationId, resolvedAt: null },
  });
  if (!alert) return null;
  return prisma.fleetAlert.update({
    where: { id: alert.id },
    data: { resolvedAt: new Date() },
  });
}

export async function escalateFleetAlert(organizationId: string, alertId: string) {
  const alert = await prisma.fleetAlert.findFirst({
    where: { id: alertId, organizationId },
    include: { vehicle: { select: { registrationNumber: true } } },
  });
  if (!alert) return null;
  const updated = await prisma.fleetAlert.update({
    where: { id: alert.id },
    data: { escalatedAt: alert.escalatedAt ?? new Date() },
  });
  return {
    id: updated.id,
    escalatedAt: updated.escalatedAt?.toISOString() ?? null,
    text:
      textField(alert.payload, "escalation") ||
      escalationText({
        type: alert.alertType,
        registration: alert.vehicle.registrationNumber,
        detail: textField(alert.payload, "detail"),
      }),
  };
}

async function refreshOfflineAlerts(organizationId: string) {
  const cutoff = new Date(Date.now() - OFFLINE_ALERT_MS);
  const stale = await prisma.fleetVehicleState.findMany({
    where: {
      organizationId,
      lastRecordedAt: { lt: cutoff },
    },
    include: { vehicle: { select: { registrationNumber: true, status: true } } },
  });
  const pending = stale.filter((row) => row.vehicle.status !== "RETIRED");
  const keys = pending.map(
    (row) => `offline:${row.vehicleId}:${row.lastRecordedAt?.toISOString() ?? "none"}`,
  );
  const existing = keys.length
    ? await prisma.fleetAlert.findMany({
        where: { organizationId, dedupeKey: { in: keys } },
        select: { dedupeKey: true },
      })
    : [];
  const seen = new Set(existing.map((row) => row.dedupeKey));
  for (const row of pending) {
    const key = `offline:${row.vehicleId}:${row.lastRecordedAt?.toISOString() ?? "none"}`;
    if (seen.has(key)) continue;
    try {
      await prisma.fleetAlert.create({
        data: {
          organizationId,
          vehicleId: row.vehicleId,
          alertType: "OFFLINE_TOO_LONG",
          priority: priorityFor("OFFLINE_TOO_LONG"),
          dedupeKey: key,
          payload: {
            headline: alertHeadline("OFFLINE_TOO_LONG", row.vehicle.registrationNumber),
            detail: "No fix for more than 2 hours. Dead zone, or the unit is off.",
            escalation: escalationText({
              type: "OFFLINE_TOO_LONG",
              registration: row.vehicle.registrationNumber,
              detail: "No fix for more than 2 hours.",
            }),
            lastRecordedAt: row.lastRecordedAt?.toISOString() ?? null,
          },
        },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
        throw error;
      }
    }
  }
}

function minutesSince(at: Date | null | undefined, now: number): number | null {
  if (!at) return null;
  return Math.max(0, Math.round((now - at.getTime()) / 60_000));
}

function dropLiters(payload: unknown): number {
  if (!payload || typeof payload !== "object") return 0;
  const value = (payload as { dropLiters?: unknown }).dropLiters;
  return typeof value === "number" ? value : 0;
}

function textField(payload: unknown, key: string): string {
  if (!payload || typeof payload !== "object") return "";
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function centroid(ring: LngLat[]): LngLat {
  const lng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const lat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  return [lng, lat];
}
