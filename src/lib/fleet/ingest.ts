import "server-only";

import { Prisma, type FleetAlertType, type FleetEngineState, type FleetNetworkStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { alertHeadline, escalationText, priorityFor } from "@/lib/fleet/alert-policy";
import { shapeContains } from "@/lib/fleet/geofence";
import { analyzeFuelWindow } from "@/lib/fleet/fuel-rules";
import { fixesInside } from "@/lib/fleet/postgis";
import {
  BREAKDOWN_MS,
  FUEL_THEFT_WINDOW_MS,
  IDLE_WARNING_MS,
  isGeofenceShape,
  SILO_QUEUE_DELAY_MS,
  SYNC_MAX_POINTS,
  type GeofenceShape,
} from "@/lib/fleet/types";
import { ashFromWeights, isGhostTrip, isPayloadAnomaly } from "@/lib/fleet/trip-rules";

const OPEN_TRIP = ["SILO_QUEUE", "GROSS_WEIGHED", "EN_ROUTE", "DUMPING"] as const;

export type SyncPointInput = {
  clientEventId: string;
  vehicleId: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  fuelLevelLiters: number;
  rpm?: number | null;
  engineState: FleetEngineState;
  networkStatus: FleetNetworkStatus;
  recordedAt: string;
};

export type SyncSlipInput = {
  externalSlipId: string;
  vehicleId: string;
  liters: number;
  recordedAt: string;
};

export type SyncResult = {
  accepted: number;
  duplicates: number;
  rejected: number;
  alertsCreated: number;
  serverTime: string;
};

type Fence = { id: string; type: string; shape: GeofenceShape };
type PointRow = {
  clientEventId: string;
  vehicleId: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  fuelLevelLiters: number;
  rpm: number | null;
  engineState: FleetEngineState;
  networkStatus: FleetNetworkStatus;
  recordedAt: Date;
};

export async function ingestTelemetryBatch(input: {
  organizationId: string;
  points: SyncPointInput[];
  slips?: SyncSlipInput[];
}): Promise<SyncResult> {
  if (input.points.length > SYNC_MAX_POINTS) {
    throw new Error(`Send at most ${SYNC_MAX_POINTS} points per sync.`);
  }

  const parsed: PointRow[] = [];
  let rejected = 0;
  for (const point of input.points) {
    const row = parsePoint(point);
    if (!row) {
      rejected += 1;
      continue;
    }
    parsed.push(row);
  }

  const vehicleIds = [...new Set(parsed.map((p) => p.vehicleId))];
  const vehicles = await prisma.fleetVehicle.findMany({
    where: { organizationId: input.organizationId, id: { in: vehicleIds } },
    select: { id: true, registrationNumber: true, fuelCapacityLiters: true, status: true },
  });
  const allowed = new Map(vehicles.map((v) => [v.id, v]));
  const owned = parsed.filter((p) => allowed.has(p.vehicleId));
  rejected += parsed.length - owned.length;

  const ids = owned.map((p) => p.clientEventId);
  const existing = ids.length
    ? await prisma.fleetTelemetryLog.findMany({
        where: { organizationId: input.organizationId, clientEventId: { in: ids } },
        select: { clientEventId: true },
      })
    : [];
  const seen = new Set(existing.map((row) => row.clientEventId));
  const fresh = owned.filter((p) => !seen.has(p.clientEventId));
  const duplicates = owned.length - fresh.length;

  const fences = await loadFences(input.organizationId);
  let alertsCreated = 0;

  if (fresh.length) {
    await prisma.fleetTelemetryLog.createMany({
      data: fresh.map((p) => ({
        organizationId: input.organizationId,
        vehicleId: p.vehicleId,
        clientEventId: p.clientEventId,
        latitude: p.latitude,
        longitude: p.longitude,
        speedKmh: p.speedKmh,
        fuelLevelLiters: p.fuelLevelLiters,
        rpm: p.rpm,
        engineState: p.engineState,
        networkStatus: p.networkStatus,
        recordedAt: p.recordedAt,
      })),
      skipDuplicates: true,
    });

    alertsCreated += await applyRules({
      organizationId: input.organizationId,
      fresh,
      vehicles: allowed,
      fences,
    });
  }

  if (input.slips?.length) {
    alertsCreated += await reconcileSlips(input.organizationId, input.slips, allowed);
  }

  return {
    accepted: fresh.length,
    duplicates,
    rejected,
    alertsCreated,
    serverTime: new Date().toISOString(),
  };
}

export async function recordWeighbridge(input: {
  organizationId: string;
  vehicleId: string;
  kind: "GROSS" | "TARE";
  weightKg: number;
  recordedAt: Date;
}): Promise<{ tripId: string; status: string; alertsCreated: number }> {
  const vehicle = await prisma.fleetVehicle.findFirst({
    where: { id: input.vehicleId, organizationId: input.organizationId },
  });
  if (!vehicle) throw new Error("Vehicle is not in this workspace.");
  if (!(input.weightKg > 0)) throw new Error("Weight must be positive.");

  const fences = await loadFences(input.organizationId);
  const dykes = fences.filter((f) => f.type === "ASH_DYKE");

  const open = await prisma.fleetTrip.findFirst({
    where: {
      organizationId: input.organizationId,
      vehicleId: vehicle.id,
      status: { in: [...OPEN_TRIP] },
    },
    orderBy: { startTime: "desc" },
  });

  if (input.kind === "GROSS") {
    const trip = open
      ? await prisma.fleetTrip.update({
          where: { id: open.id },
          data: {
            grossWeightKg: input.weightKg,
            status: open.status === "SILO_QUEUE" ? "GROSS_WEIGHED" : open.status,
          },
        })
      : await prisma.fleetTrip.create({
          data: {
            organizationId: input.organizationId,
            vehicleId: vehicle.id,
            startTime: input.recordedAt,
            grossWeightKg: input.weightKg,
            status: "GROSS_WEIGHED",
          },
        });
    return { tripId: trip.id, status: trip.status, alertsCreated: 0 };
  }

  const trip =
    open ??
    (await prisma.fleetTrip.create({
      data: {
        organizationId: input.organizationId,
        vehicleId: vehicle.id,
        startTime: input.recordedAt,
        status: "EN_ROUTE",
      },
    }));

  const from = trip.grossWeightKg != null ? trip.startTime : trip.startTime;
  const fixes = await prisma.fleetTelemetryLog.findMany({
    where: {
      organizationId: input.organizationId,
      vehicleId: vehicle.id,
      recordedAt: { gte: from, lte: input.recordedAt },
    },
    select: { id: true, latitude: true, longitude: true },
  });
  let dykeFixCount = 0;
  for (const dyke of dykes) {
    const inside = await fixesInside(
      dyke.shape,
      fixes.map((f) => ({ id: f.id, latitude: f.latitude, longitude: f.longitude })),
    );
    dykeFixCount = Math.max(dykeFixCount, inside.size);
  }

  const gross = trip.grossWeightKg;
  const tare = input.weightKg;
  const ash = gross != null ? ashFromWeights(gross, tare) : null;
  const ghost = isGhostTrip({ grossWeightKg: gross, tareWeightKg: tare, dykeFixCount });
  const payloadBad = isPayloadAnomaly({
    grossWeightKg: gross,
    tareWeightKg: tare,
    dykeFixCount,
    payloadMinKg: vehicle.payloadMinKg,
    payloadMaxKg: vehicle.payloadMaxKg,
  });

  const updated = await prisma.fleetTrip.update({
    where: { id: trip.id },
    data: {
      tareWeightKg: tare,
      endTime: input.recordedAt,
      dykeFixCount,
      ashTonnes: ash?.ashTonnes ?? null,
      ashVolumeM3: ash?.ashVolumeM3 ?? null,
      status: ghost ? "GHOST" : "COMPLETED",
    },
  });

  let alertsCreated = 0;
  if (ghost) {
    alertsCreated += await raise(input.organizationId, vehicle.id, vehicle.registrationNumber, "GHOST_TRIP", {
      dedupeKey: `ghost:${updated.id}`,
      detail: "Gross and tare are on the slip. No GPS fix inside the ash dyke.",
      payload: { tripId: updated.id, grossWeightKg: gross, tareWeightKg: tare },
    });
  }
  if (payloadBad && gross != null) {
    alertsCreated += await raise(input.organizationId, vehicle.id, vehicle.registrationNumber, "PAYLOAD_ANOMALY", {
      dedupeKey: `payload:${updated.id}`,
      detail: `Net ${Math.round(gross - tare)} kg. Band is ${vehicle.payloadMinKg}–${vehicle.payloadMaxKg} kg.`,
      payload: { tripId: updated.id, grossWeightKg: gross, tareWeightKg: tare },
    });
  }

  return { tripId: updated.id, status: updated.status, alertsCreated };
}

async function applyRules(input: {
  organizationId: string;
  fresh: PointRow[];
  vehicles: Map<string, { id: string; registrationNumber: string; fuelCapacityLiters: number; status: string }>;
  fences: Fence[];
}): Promise<number> {
  let created = 0;
  const byVehicle = group(input.fresh);
  for (const [vehicleId, points] of byVehicle) {
    const vehicle = input.vehicles.get(vehicleId);
    if (!vehicle) continue;
    points.sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
    created += await fuelAndSensor(input.organizationId, vehicle, points);
    created += await geofenceAndDwell(input.organizationId, vehicle, points, input.fences);
  }
  return created;
}

async function fuelAndSensor(
  organizationId: string,
  vehicle: { id: string; registrationNumber: string; fuelCapacityLiters: number },
  points: PointRow[],
): Promise<number> {
  const min = points[0].recordedAt;
  const max = points[points.length - 1].recordedAt;
  const history = await prisma.fleetTelemetryLog.findMany({
    where: {
      organizationId,
      vehicleId: vehicle.id,
      recordedAt: {
        gte: new Date(min.getTime() - FUEL_THEFT_WINDOW_MS),
        lte: max,
      },
    },
    select: { recordedAt: true, fuelLevelLiters: true, speedKmh: true },
    orderBy: { recordedAt: "asc" },
  });
  const analysis = analyzeFuelWindow(history, vehicle.fuelCapacityLiters);
  let created = 0;
  for (const theft of analysis.thefts) {
    created += await raise(organizationId, vehicle.id, vehicle.registrationNumber, "FUEL_THEFT", {
      dedupeKey: `fuel:${vehicle.id}:${bucket(theft.from, FUEL_THEFT_WINDOW_MS)}`,
      detail: `${theft.dropLiters} L down while the truck was under 5 km/h.`,
      payload: {
        dropLiters: theft.dropLiters,
        from: theft.from.toISOString(),
        to: theft.to.toISOString(),
      },
    });
  }
  for (const fault of analysis.sensorFaults) {
    created += await raise(organizationId, vehicle.id, vehicle.registrationNumber, "SENSOR_FAULT", {
      dedupeKey: `sensor:${vehicle.id}:${bucket(fault.at, 60_000)}`,
      detail: `Tank reading fell ${fault.dropLiters} L in under 30 seconds.`,
      payload: { dropLiters: fault.dropLiters, at: fault.at.toISOString() },
    });
  }
  return created;
}

async function geofenceAndDwell(
  organizationId: string,
  vehicle: { id: string; registrationNumber: string; status: string },
  points: PointRow[],
  fences: Fence[],
): Promise<number> {
  const state = await prisma.fleetVehicleState.findUnique({ where: { vehicleId: vehicle.id } });
  let siloEnteredAt = state?.siloEnteredAt ?? null;
  let dykeEnteredAt = state?.dykeEnteredAt ?? null;
  let idleSince = state?.idleSince ?? null;
  let stoppedSince = state?.stoppedSince ?? null;
  let offlineSince = state?.offlineSince ?? null;
  let lastRecordedAt = state?.lastRecordedAt ?? null;
  let created = 0;
  const tip = points[points.length - 1];

  const advancing = points.filter((p) => !lastRecordedAt || p.recordedAt >= lastRecordedAt);
  for (const point of advancing) {
    const where = classify(point, fences);
    const slow = point.speedKmh < 5;
    if (where.silo && slow) {
      siloEnteredAt = siloEnteredAt ?? point.recordedAt;
    } else {
      siloEnteredAt = null;
    }
    if (where.dyke && slow) {
      dykeEnteredAt = dykeEnteredAt ?? point.recordedAt;
    } else {
      dykeEnteredAt = null;
    }
    const parked = slow && !where.silo && !where.dyke && !where.weighbridge;
    if (parked && point.engineState === "IDLING") {
      idleSince = idleSince ?? point.recordedAt;
    } else {
      idleSince = null;
    }
    if (parked && (point.engineState === "OFF" || point.engineState === "IDLING")) {
      stoppedSince = stoppedSince ?? point.recordedAt;
    } else {
      stoppedSince = null;
    }
    if (point.networkStatus === "OFFLINE") {
      offlineSince = offlineSince ?? point.recordedAt;
    } else {
      offlineSince = null;
    }
    lastRecordedAt = point.recordedAt;

    if (where.unauthorized && slow) {
      created += await raise(organizationId, vehicle.id, vehicle.registrationNumber, "UNAUTHORIZED_DUMP", {
        dedupeKey: `dump:${vehicle.id}:${bucket(point.recordedAt, 10 * 60_000)}`,
        detail: "Stationary inside an unauthorized zone.",
        payload: { latitude: point.latitude, longitude: point.longitude, at: point.recordedAt.toISOString() },
      });
    } else if (where.unauthorized && point.engineState === "MOVING") {
      created += await raise(organizationId, vehicle.id, vehicle.registrationNumber, "ROUTE_EXIT", {
        dedupeKey: `unauth-move:${vehicle.id}:${bucket(point.recordedAt, 10 * 60_000)}`,
        detail: "Moving inside an unauthorized zone.",
        payload: { latitude: point.latitude, longitude: point.longitude },
      });
    } else if (
      fences.some((f) => f.type === "ROUTE") &&
      point.engineState === "MOVING" &&
      !where.route &&
      !where.silo &&
      !where.dyke &&
      !where.weighbridge
    ) {
      created += await raise(organizationId, vehicle.id, vehicle.registrationNumber, "ROUTE_EXIT", {
        dedupeKey: `route:${vehicle.id}:${bucket(point.recordedAt, 10 * 60_000)}`,
        detail: "Moving outside the designated haul road.",
        payload: { latitude: point.latitude, longitude: point.longitude },
      });
    }

    if (where.dyke) {
      await prisma.fleetTrip.updateMany({
        where: {
          organizationId,
          vehicleId: vehicle.id,
          status: { in: ["GROSS_WEIGHED", "EN_ROUTE"] },
        },
        data: { status: "DUMPING" },
      });
    }
  }

  const now = tip.recordedAt;
  if (siloEnteredAt && now.getTime() - siloEnteredAt.getTime() > SILO_QUEUE_DELAY_MS) {
    created += await raise(organizationId, vehicle.id, vehicle.registrationNumber, "SILO_QUEUE_DELAY", {
      dedupeKey: `silo:${vehicle.id}:${bucket(siloEnteredAt, 30 * 60_000)}`,
      detail: `In the silo queue since ${siloEnteredAt.toISOString()}.`,
      payload: { since: siloEnteredAt.toISOString() },
    });
  }
  if (
    stoppedSince &&
    now.getTime() - stoppedSince.getTime() > BREAKDOWN_MS &&
    !siloEnteredAt
  ) {
    created += await raise(organizationId, vehicle.id, vehicle.registrationNumber, "BREAKDOWN", {
      dedupeKey: `down:${vehicle.id}:${bucket(stoppedSince, 30 * 60_000)}`,
      detail: "Stationary outside the silo and the dyke for more than 45 minutes.",
      payload: { since: stoppedSince.toISOString() },
    });
  } else if (idleSince && now.getTime() - idleSince.getTime() > IDLE_WARNING_MS) {
    created += await raise(organizationId, vehicle.id, vehicle.registrationNumber, "EXCESS_IDLING", {
      dedupeKey: `idle:${vehicle.id}:${bucket(idleSince, 20 * 60_000)}`,
      detail: "Engine idling outside the silo and the dyke for more than 20 minutes.",
      payload: { since: idleSince.toISOString() },
    });
  }

  if (advancing.length) {
    const latest = advancing[advancing.length - 1];
    await prisma.fleetVehicleState.upsert({
      where: { vehicleId: vehicle.id },
      create: {
        vehicleId: vehicle.id,
        organizationId,
        latitude: latest.latitude,
        longitude: latest.longitude,
        speedKmh: latest.speedKmh,
        fuelLevelLiters: latest.fuelLevelLiters,
        rpm: latest.rpm,
        engineState: latest.engineState,
        networkStatus: latest.networkStatus,
        lastRecordedAt: latest.recordedAt,
        siloEnteredAt,
        dykeEnteredAt,
        idleSince,
        stoppedSince,
        offlineSince,
      },
      update: {
        latitude: latest.latitude,
        longitude: latest.longitude,
        speedKmh: latest.speedKmh,
        fuelLevelLiters: latest.fuelLevelLiters,
        rpm: latest.rpm,
        engineState: latest.engineState,
        networkStatus: latest.networkStatus,
        lastRecordedAt: latest.recordedAt,
        siloEnteredAt,
        dykeEnteredAt,
        idleSince,
        stoppedSince,
        offlineSince,
      },
    });
  }

  return created;
}

async function reconcileSlips(
  organizationId: string,
  slips: SyncSlipInput[],
  vehicles: Map<string, { id: string; registrationNumber: string }>,
): Promise<number> {
  let created = 0;
  for (const slip of slips) {
    const vehicle = vehicles.get(slip.vehicleId);
    if (!vehicle || !(slip.liters > 0) || !slip.externalSlipId) continue;
    const at = new Date(slip.recordedAt);
    if (Number.isNaN(at.getTime())) continue;
    const exists = await prisma.fleetFuelSlip.findUnique({
      where: {
        organizationId_externalSlipId: {
          organizationId,
          externalSlipId: slip.externalSlipId,
        },
      },
    });
    if (exists) continue;
    const windowStart = new Date(at.getTime() - 20 * 60_000);
    const windowEnd = new Date(at.getTime() + 20 * 60_000);
    const samples = await prisma.fleetTelemetryLog.findMany({
      where: { organizationId, vehicleId: vehicle.id, recordedAt: { gte: windowStart, lte: windowEnd } },
      orderBy: { recordedAt: "asc" },
      select: { recordedAt: true, fuelLevelLiters: true },
    });
    const before = [...samples].reverse().find((s) => s.recordedAt <= at);
    const after = samples.find((s) => s.recordedAt >= at);
    const sensorBefore = before?.fuelLevelLiters ?? null;
    const sensorAfter = after?.fuelLevelLiters ?? null;
    const delta =
      sensorBefore != null && sensorAfter != null ? sensorAfter - sensorBefore : null;
    const variance = delta != null ? Math.abs(delta - slip.liters) / slip.liters : null;
    const flagged = variance != null && variance > 0.05;
    await prisma.fleetFuelSlip.create({
      data: {
        organizationId,
        vehicleId: vehicle.id,
        externalSlipId: slip.externalSlipId,
        liters: slip.liters,
        sensorBefore,
        sensorAfter,
        variancePct: variance,
        flagged,
        recordedAt: at,
      },
    });
    if (flagged && variance != null) {
      created += await raise(organizationId, vehicle.id, vehicle.registrationNumber, "FUEL_SLIP_VARIANCE", {
        dedupeKey: `slip:${slip.externalSlipId}`,
        detail: `Slip ${slip.liters} L, tank changed ${delta?.toFixed(1)} L (${Math.round(variance * 100)}%).`,
        payload: { externalSlipId: slip.externalSlipId, liters: slip.liters, sensorDelta: delta, variancePct: variance },
      });
    }
  }
  return created;
}

async function raise(
  organizationId: string,
  vehicleId: string,
  registration: string,
  type: FleetAlertType,
  body: { dedupeKey: string; detail: string; payload: Prisma.InputJsonObject },
): Promise<number> {
  try {
    await prisma.fleetAlert.create({
      data: {
        organizationId,
        vehicleId,
        alertType: type,
        priority: priorityFor(type),
        dedupeKey: body.dedupeKey,
        payload: {
          ...body.payload,
          registration,
          headline: alertHeadline(type, registration),
          detail: body.detail,
          escalation: escalationText({ type, registration, detail: body.detail }),
        },
      },
    });
    return 1;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return 0;
    }
    throw error;
  }
}

function classify(point: PointRow, fences: Fence[]) {
  const at: [number, number] = [point.longitude, point.latitude];
  const hit = (type: string) =>
    fences.some((f) => f.type === type && shapeContains(f.shape, at));
  return {
    silo: hit("SILO"),
    dyke: hit("ASH_DYKE"),
    weighbridge: hit("WEIGHBRIDGE"),
    unauthorized: hit("UNAUTHORIZED"),
    route: hit("ROUTE"),
  };
}

async function loadFences(organizationId: string): Promise<Fence[]> {
  const rows = await prisma.fleetGeofence.findMany({
    where: { organizationId, active: true },
  });
  return rows.flatMap((row) => {
    if (!isGeofenceShape(row.polygonCoordinates)) return [];
    return [{ id: row.id, type: row.type, shape: row.polygonCoordinates }];
  });
}

function parsePoint(point: SyncPointInput): PointRow | null {
  if (!point || typeof point !== "object") return null;
  const recordedAt = new Date(point.recordedAt);
  if (!point.clientEventId || !point.vehicleId) return null;
  if (Number.isNaN(recordedAt.getTime())) return null;
  const skew = Date.now() - recordedAt.getTime();
  if (skew < -5 * 60_000 || skew > 30 * 24 * 60 * 60_000) return null;
  if (!Number.isFinite(point.latitude) || point.latitude < -90 || point.latitude > 90) return null;
  if (!Number.isFinite(point.longitude) || point.longitude < -180 || point.longitude > 180) return null;
  if (point.latitude === 0 && point.longitude === 0) return null;
  if (!Number.isFinite(point.speedKmh) || point.speedKmh < 0 || point.speedKmh > 160) return null;
  if (!Number.isFinite(point.fuelLevelLiters) || point.fuelLevelLiters < 0) return null;
  if (!["OFF", "IDLING", "MOVING"].includes(point.engineState)) return null;
  if (!["ONLINE", "OFFLINE"].includes(point.networkStatus)) return null;
  return {
    clientEventId: point.clientEventId,
    vehicleId: point.vehicleId,
    latitude: point.latitude,
    longitude: point.longitude,
    speedKmh: point.speedKmh,
    fuelLevelLiters: point.fuelLevelLiters,
    rpm: point.rpm == null ? null : Math.round(point.rpm),
    engineState: point.engineState,
    networkStatus: point.networkStatus,
    recordedAt,
  };
}

function group(points: PointRow[]): Map<string, PointRow[]> {
  const map = new Map<string, PointRow[]>();
  for (const point of points) {
    const list = map.get(point.vehicleId) ?? [];
    list.push(point);
    map.set(point.vehicleId, list);
  }
  return map;
}

function bucket(at: Date, ms: number): number {
  return Math.floor(at.getTime() / ms);
}
