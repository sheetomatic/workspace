-- HRMS Phase 2: swap leave/off-day, field GPS pings, visit geofence, weeklyOffDay

DO $$ BEGIN
  CREATE TYPE "HrSwapType" AS ENUM ('LEAVE_SWAP', 'OFF_DAY_SWAP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Membership"
  ADD COLUMN IF NOT EXISTS "weeklyOffDay" INTEGER;

CREATE TABLE IF NOT EXISTS "HrSwapRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "swapType" "HrSwapType" NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "reason" TEXT,
    "leaveRequestId" TEXT,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrSwapRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "HrSwapRequest_organizationId_status_idx"
  ON "HrSwapRequest"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "HrSwapRequest_organizationId_userId_idx"
  ON "HrSwapRequest"("organizationId", "userId");

DO $$ BEGIN
  ALTER TABLE "HrSwapRequest" ADD CONSTRAINT "HrSwapRequest_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "HrSwapRequest" ADD CONSTRAINT "HrSwapRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "HrSwapRequest" ADD CONSTRAINT "HrSwapRequest_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "FieldVisit"
  ADD COLUMN IF NOT EXISTS "geoLat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "geoLng" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "radiusM" INTEGER;

ALTER TABLE "FieldCheckIn"
  ADD COLUMN IF NOT EXISTS "geoFenceOk" BOOLEAN;

CREATE TABLE IF NOT EXISTS "FieldLocationPing" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "geoLat" DOUBLE PRECISION NOT NULL,
    "geoLng" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accuracyM" DOUBLE PRECISION,
    "batteryPct" INTEGER,
    "isMockLocation" BOOLEAN,

    CONSTRAINT "FieldLocationPing_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FieldLocationPing_organizationId_recordedAt_idx"
  ON "FieldLocationPing"("organizationId", "recordedAt");
CREATE INDEX IF NOT EXISTS "FieldLocationPing_organizationId_userId_recordedAt_idx"
  ON "FieldLocationPing"("organizationId", "userId", "recordedAt");

DO $$ BEGIN
  ALTER TABLE "FieldLocationPing" ADD CONSTRAINT "FieldLocationPing_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "FieldLocationPing" ADD CONSTRAINT "FieldLocationPing_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
