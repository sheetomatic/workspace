-- Ash / dust dumper fleet. Spatial checks use PostGIS when the extension
-- is installed; the app falls back to the same rules in TypeScript so this
-- migration does not require CREATE EXTENSION (embedded Postgres has no PostGIS).

CREATE TYPE "FleetVehicleType" AS ENUM ('ASH_DUMPER', 'DUST_DUMPER', 'WATER_TANKER', 'SUPPORT');
CREATE TYPE "FleetVehicleStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'BREAKDOWN', 'OFFLINE', 'RETIRED');
CREATE TYPE "FleetDriverStatus" AS ENUM ('ON_DUTY', 'OFF_DUTY', 'SUSPENDED');
CREATE TYPE "FleetGeofenceType" AS ENUM ('SILO', 'WEIGHBRIDGE', 'ASH_DYKE', 'UNAUTHORIZED', 'ROUTE');
CREATE TYPE "FleetEngineState" AS ENUM ('OFF', 'IDLING', 'MOVING');
CREATE TYPE "FleetNetworkStatus" AS ENUM ('ONLINE', 'OFFLINE');
CREATE TYPE "FleetTripStatus" AS ENUM ('SILO_QUEUE', 'GROSS_WEIGHED', 'EN_ROUTE', 'DUMPING', 'TARE_WEIGHED', 'COMPLETED', 'GHOST', 'CANCELLED');
CREATE TYPE "FleetAlertType" AS ENUM ('FUEL_THEFT', 'UNAUTHORIZED_DUMP', 'BREAKDOWN', 'EXCESS_IDLING', 'SILO_QUEUE_DELAY', 'OFFLINE_TOO_LONG', 'GHOST_TRIP', 'PAYLOAD_ANOMALY', 'FUEL_SLIP_VARIANCE', 'ROUTE_EXIT', 'SENSOR_FAULT', 'SHIFT_START', 'SHIFT_END', 'MAINTENANCE_DUE');
CREATE TYPE "FleetAlertPriority" AS ENUM ('CRITICAL', 'WARNING', 'INFO');

CREATE TABLE "FleetVehicle" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "vehicleType" "FleetVehicleType" NOT NULL DEFAULT 'ASH_DUMPER',
    "fuelCapacityLiters" DOUBLE PRECISION NOT NULL,
    "payloadMinKg" DOUBLE PRECISION NOT NULL DEFAULT 12000,
    "payloadMaxKg" DOUBLE PRECISION NOT NULL DEFAULT 32000,
    "status" "FleetVehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FleetVehicle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FleetDriver" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "status" "FleetDriverStatus" NOT NULL DEFAULT 'OFF_DUTY',
    "currentVehicleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FleetDriver_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FleetVehicleState" (
    "vehicleId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "speedKmh" DOUBLE PRECISION,
    "fuelLevelLiters" DOUBLE PRECISION,
    "rpm" INTEGER,
    "engineState" "FleetEngineState",
    "networkStatus" "FleetNetworkStatus",
    "lastRecordedAt" TIMESTAMP(3),
    "siloEnteredAt" TIMESTAMP(3),
    "dykeEnteredAt" TIMESTAMP(3),
    "idleSince" TIMESTAMP(3),
    "stoppedSince" TIMESTAMP(3),
    "offlineSince" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FleetVehicleState_pkey" PRIMARY KEY ("vehicleId")
);

CREATE TABLE "FleetGeofence" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FleetGeofenceType" NOT NULL,
    "polygonCoordinates" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FleetGeofence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FleetTelemetryLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "clientEventId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "speedKmh" DOUBLE PRECISION NOT NULL,
    "fuelLevelLiters" DOUBLE PRECISION NOT NULL,
    "rpm" INTEGER,
    "engineState" "FleetEngineState" NOT NULL,
    "networkStatus" "FleetNetworkStatus" NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FleetTelemetryLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FleetTrip" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "grossWeightKg" DOUBLE PRECISION,
    "tareWeightKg" DOUBLE PRECISION,
    "ashTonnes" DOUBLE PRECISION,
    "ashVolumeM3" DOUBLE PRECISION,
    "dykeFixCount" INTEGER NOT NULL DEFAULT 0,
    "status" "FleetTripStatus" NOT NULL DEFAULT 'SILO_QUEUE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FleetTrip_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FleetAlert" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "alertType" "FleetAlertType" NOT NULL,
    "priority" "FleetAlertPriority" NOT NULL,
    "payload" JSONB NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "escalatedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FleetAlert_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FleetFuelSlip" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "externalSlipId" TEXT NOT NULL,
    "liters" DOUBLE PRECISION NOT NULL,
    "sensorBefore" DOUBLE PRECISION,
    "sensorAfter" DOUBLE PRECISION,
    "variancePct" DOUBLE PRECISION,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FleetFuelSlip_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FleetVehicle_organizationId_registrationNumber_key" ON "FleetVehicle"("organizationId", "registrationNumber");
CREATE INDEX "FleetVehicle_organizationId_status_idx" ON "FleetVehicle"("organizationId", "status");
CREATE UNIQUE INDEX "FleetDriver_organizationId_licenseNumber_key" ON "FleetDriver"("organizationId", "licenseNumber");
CREATE INDEX "FleetDriver_organizationId_status_idx" ON "FleetDriver"("organizationId", "status");
CREATE INDEX "FleetVehicleState_organizationId_idx" ON "FleetVehicleState"("organizationId");
CREATE UNIQUE INDEX "FleetGeofence_organizationId_name_key" ON "FleetGeofence"("organizationId", "name");
CREATE INDEX "FleetGeofence_organizationId_type_idx" ON "FleetGeofence"("organizationId", "type");
CREATE UNIQUE INDEX "FleetTelemetryLog_organizationId_clientEventId_key" ON "FleetTelemetryLog"("organizationId", "clientEventId");
CREATE INDEX "FleetTelemetryLog_organizationId_vehicleId_recordedAt_idx" ON "FleetTelemetryLog"("organizationId", "vehicleId", "recordedAt");
CREATE INDEX "FleetTrip_organizationId_status_idx" ON "FleetTrip"("organizationId", "status");
CREATE INDEX "FleetTrip_organizationId_vehicleId_startTime_idx" ON "FleetTrip"("organizationId", "vehicleId", "startTime");
CREATE UNIQUE INDEX "FleetAlert_organizationId_dedupeKey_key" ON "FleetAlert"("organizationId", "dedupeKey");
CREATE INDEX "FleetAlert_organizationId_priority_resolvedAt_idx" ON "FleetAlert"("organizationId", "priority", "resolvedAt");
CREATE UNIQUE INDEX "FleetFuelSlip_organizationId_externalSlipId_key" ON "FleetFuelSlip"("organizationId", "externalSlipId");
CREATE INDEX "FleetFuelSlip_organizationId_vehicleId_recordedAt_idx" ON "FleetFuelSlip"("organizationId", "vehicleId", "recordedAt");

ALTER TABLE "FleetVehicle" ADD CONSTRAINT "FleetVehicle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FleetDriver" ADD CONSTRAINT "FleetDriver_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FleetDriver" ADD CONSTRAINT "FleetDriver_currentVehicleId_fkey" FOREIGN KEY ("currentVehicleId") REFERENCES "FleetVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FleetVehicleState" ADD CONSTRAINT "FleetVehicleState_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "FleetVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FleetGeofence" ADD CONSTRAINT "FleetGeofence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FleetTelemetryLog" ADD CONSTRAINT "FleetTelemetryLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FleetTelemetryLog" ADD CONSTRAINT "FleetTelemetryLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "FleetVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FleetTrip" ADD CONSTRAINT "FleetTrip_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FleetTrip" ADD CONSTRAINT "FleetTrip_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "FleetVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FleetTrip" ADD CONSTRAINT "FleetTrip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "FleetDriver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FleetAlert" ADD CONSTRAINT "FleetAlert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FleetAlert" ADD CONSTRAINT "FleetAlert_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "FleetVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FleetFuelSlip" ADD CONSTRAINT "FleetFuelSlip_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FleetFuelSlip" ADD CONSTRAINT "FleetFuelSlip_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "FleetVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
