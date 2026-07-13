-- CreateTable
CREATE TABLE IF NOT EXISTS "HrShift" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrShift_pkey" PRIMARY KEY ("id")
);

-- AlterTable Membership
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "shiftId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "HrShift_organizationId_name_key" ON "HrShift"("organizationId", "name");
CREATE INDEX IF NOT EXISTS "HrShift_organizationId_isActive_idx" ON "HrShift"("organizationId", "isActive");
CREATE INDEX IF NOT EXISTS "Membership_shiftId_idx" ON "Membership"("shiftId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "HrShift" ADD CONSTRAINT "HrShift_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Membership" ADD CONSTRAINT "Membership_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "HrShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed a General shift from existing org default work hours (idempotent per org).
INSERT INTO "HrShift" ("id", "organizationId", "name", "code", "startTime", "endTime", "isDefault", "isActive", "sortOrder", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text),
  s."organizationId",
  'General',
  'GEN',
  COALESCE(NULLIF(s."workStartTime", ''), '09:30'),
  COALESCE(NULLIF(s."workEndTime", ''), '18:30'),
  true,
  true,
  0,
  CURRENT_TIMESTAMP
FROM "WorkspaceHrSettings" s
WHERE NOT EXISTS (
  SELECT 1 FROM "HrShift" h WHERE h."organizationId" = s."organizationId" AND h."name" = 'General'
);
