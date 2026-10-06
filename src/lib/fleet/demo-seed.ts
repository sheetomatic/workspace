import "server-only";

import { prisma } from "@/lib/db";
import { ingestTelemetryBatch, recordWeighbridge } from "@/lib/fleet/ingest";

/**
 * One compact yard around a fictional plant so the map and the rules
 * can be seen without a live dumper. Safe to call twice: the second
 * call does nothing.
 */
export async function seedFleetDemo(organizationId: string): Promise<{ seeded: boolean }> {
  const existing = await prisma.fleetVehicle.count({ where: { organizationId } });
  if (existing > 0) return { seeded: false };

  const now = Date.now();
  const silo: [number, number] = [82.695, 24.205];

  await prisma.fleetGeofence.createMany({
    data: [
      {
        organizationId,
        name: "Silo 2",
        type: "SILO",
        polygonCoordinates: { kind: "circle", center: silo, radiusM: 140 },
      },
      {
        organizationId,
        name: "Weighbridge A",
        type: "WEIGHBRIDGE",
        polygonCoordinates: {
          kind: "polygon",
          ring: [
            [82.6962, 24.2042],
            [82.6974, 24.2042],
            [82.6974, 24.2034],
            [82.6962, 24.2034],
          ],
        },
      },
      {
        organizationId,
        name: "Ash dyke 4",
        type: "ASH_DYKE",
        polygonCoordinates: {
          kind: "polygon",
          ring: [
            [82.708, 24.208],
            [82.716, 24.208],
            [82.716, 24.202],
            [82.708, 24.202],
          ],
        },
      },
      {
        organizationId,
        name: "South bund — do not dump",
        type: "UNAUTHORIZED",
        polygonCoordinates: {
          kind: "polygon",
          ring: [
            [82.7, 24.198],
            [82.71, 24.198],
            [82.71, 24.193],
            [82.7, 24.193],
          ],
        },
      },
      {
        organizationId,
        name: "Haul road",
        type: "ROUTE",
        polygonCoordinates: {
          kind: "polygon",
          ring: [
            [82.693, 24.2075],
            [82.718, 24.2105],
            [82.718, 24.199],
            [82.693, 24.201],
          ],
        },
      },
    ],
  });

  const specs: Array<{ reg: string; type?: "ASH_DUMPER" | "DUST_DUMPER"; status?: "ACTIVE" | "BREAKDOWN" | "OFFLINE" }> = [
    { reg: "UP32AD1001" },
    { reg: "UP32AD1002" },
    { reg: "UP32AD1003" },
    { reg: "UP32AD1004" },
    { reg: "UP32AD1005" },
    { reg: "UP32AD1006" },
    { reg: "UP32AD1007", status: "OFFLINE" },
    { reg: "UP32AD1008", status: "BREAKDOWN" },
    { reg: "UP32AD1009" },
    { reg: "UP32AD1010", type: "DUST_DUMPER" },
  ];

  const vehicles = [];
  for (const spec of specs) {
    const vehicle = await prisma.fleetVehicle.create({
      data: {
        organizationId,
        registrationNumber: spec.reg,
        vehicleType: spec.type ?? "ASH_DUMPER",
        fuelCapacityLiters: 400,
        payloadMinKg: 15000,
        payloadMaxKg: 32000,
        status: spec.status ?? "ACTIVE",
      },
    });
    vehicles.push(vehicle);
  }
  const byReg = new Map(vehicles.map((v) => [v.registrationNumber, v]));

  const driver = await prisma.fleetDriver.create({
    data: {
      organizationId,
      name: "Raju Yadav",
      licenseNumber: "UP-2024-44190",
      status: "ON_DUTY",
      currentVehicleId: byReg.get("UP32AD1001")!.id,
    },
  });

  const point = (
    reg: string,
    minutesAgo: number,
    lng: number,
    lat: number,
    speed: number,
    fuel: number,
    engine: "OFF" | "IDLING" | "MOVING",
    network: "ONLINE" | "OFFLINE" = "ONLINE",
  ) => ({
    clientEventId: `demo-${reg}-${minutesAgo}`,
    vehicleId: byReg.get(reg)!.id,
    latitude: lat,
    longitude: lng,
    speedKmh: speed,
    fuelLevelLiters: fuel,
    rpm: engine === "OFF" ? 0 : engine === "IDLING" ? 700 : 1500,
    engineState: engine,
    networkStatus: network,
    recordedAt: new Date(now - minutesAgo * 60_000).toISOString(),
  });

  await ingestTelemetryBatch({
    organizationId,
    points: [
      point("UP32AD1001", 2, 82.702, 24.2055, 34, 260, "MOVING"),
      point("UP32AD1002", 1, 82.706, 24.2062, 28, 240, "MOVING"),
      point("UP32AD1003", 12, silo[0], silo[1], 0, 310, "IDLING"),
      point("UP32AD1004", 40, silo[0] + 0.0004, silo[1] + 0.0002, 0, 280, "IDLING"),
      point("UP32AD1004", 5, silo[0] + 0.0004, silo[1] + 0.0002, 0, 278, "IDLING"),
      point("UP32AD1005", 8, 82.712, 24.205, 1, 220, "IDLING"),
      point("UP32AD1006", 25, 82.699, 24.2068, 0, 300, "IDLING"),
      point("UP32AD1006", 2, 82.699, 24.2068, 0, 298, "IDLING"),
      point("UP32AD1007", 180, 82.701, 24.204, 0, 190, "OFF", "OFFLINE"),
      point("UP32AD1008", 50, 82.704, 24.2005, 0, 210, "OFF"),
      point("UP32AD1008", 1, 82.704, 24.2005, 0, 208, "OFF"),
      point("UP32AD1009", 8, 82.6985, 24.2038, 0, 180, "OFF"),
      point("UP32AD1009", 4, 82.6985, 24.2038, 0, 164, "OFF"),
      point("UP32AD1010", 6, 82.705, 24.1955, 0, 250, "IDLING"),
    ],
  });

  // Honest trip: gross, dyke fix, tare.
  const honest = byReg.get("UP32AD1002")!;
  await recordWeighbridge({
    organizationId,
    vehicleId: honest.id,
    kind: "GROSS",
    weightKg: 54800,
    recordedAt: new Date(now - 90 * 60_000),
  });
  await prisma.fleetTelemetryLog.create({
    data: {
      organizationId,
      vehicleId: honest.id,
      clientEventId: "demo-honest-dyke",
      latitude: 24.205,
      longitude: 82.712,
      speedKmh: 2,
      fuelLevelLiters: 250,
      engineState: "IDLING",
      networkStatus: "ONLINE",
      recordedAt: new Date(now - 40 * 60_000),
    },
  });
  await recordWeighbridge({
    organizationId,
    vehicleId: honest.id,
    kind: "TARE",
    weightKg: 22400,
    recordedAt: new Date(now - 20 * 60_000),
  });

  // Ghost: weights, no dyke fix.
  const ghost = byReg.get("UP32AD1010")!;
  await recordWeighbridge({
    organizationId,
    vehicleId: ghost.id,
    kind: "GROSS",
    weightKg: 50100,
    recordedAt: new Date(now - 3 * 60 * 60_000),
  });
  await recordWeighbridge({
    organizationId,
    vehicleId: ghost.id,
    kind: "TARE",
    weightKg: 21000,
    recordedAt: new Date(now - 2 * 60 * 60_000),
  });

  await prisma.fleetTrip.updateMany({
    where: { organizationId, vehicleId: honest.id },
    data: { driverId: driver.id },
  });

  return { seeded: true };
}
