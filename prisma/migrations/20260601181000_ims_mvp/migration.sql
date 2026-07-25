-- IMS MVP.
-- NOTE: This migration was originally dated 20260330120000 (before the
-- 20260528120000_init_postgres baseline and the 20260601180000 migration that
-- creates the "WorkspaceModule" enum). That ordering made a from-scratch
-- `prisma migrate deploy` / `migrate reset` fail with `type "WorkspaceModule"
-- does not exist` (and unresolved FKs to Organization/User). It is renamed to
-- sort after those dependencies, and every statement is made idempotent so it
-- is safe to (re)apply.

-- AlterEnum
ALTER TYPE "WorkspaceModule" ADD VALUE IF NOT EXISTS 'IMS';

-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "ImsItemType" AS ENUM ('RAW_MATERIAL', 'FINISHED_GOOD');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "ImsAbcClass" AS ENUM ('A', 'B', 'C');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "ImsQcPolicy" AS ENUM ('OFF', 'OPTIONAL', 'ALWAYS');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "ImsStoreType" AS ENUM ('RM', 'FG');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "ImsStockBucket" AS ENUM ('USABLE', 'QC_PENDING');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "ImsMovementType" AS ENUM ('RM_IN', 'ISSUE_TO_PRODUCTION', 'FG_IN', 'FG_OUT', 'QC_PASS', 'QC_FAIL');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "ImsQcStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ImsItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "uom" TEXT NOT NULL DEFAULT 'pcs',
    "category" TEXT,
    "itemType" "ImsItemType" NOT NULL DEFAULT 'RAW_MATERIAL',
    "abcClass" "ImsAbcClass" NOT NULL DEFAULT 'C',
    "unitCost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "minQty" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "reorderQty" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "maxQty" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "qcOnReceipt" "ImsQcPolicy" NOT NULL DEFAULT 'OPTIONAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImsItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ImsStockBalance" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "storeType" "ImsStoreType" NOT NULL,
    "bucket" "ImsStockBucket" NOT NULL DEFAULT 'USABLE',
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImsStockBalance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ImsStockMovement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "movementType" "ImsMovementType" NOT NULL,
    "storeType" "ImsStoreType" NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitCost" DECIMAL(18,4) NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "qcRequired" BOOLEAN NOT NULL DEFAULT false,
    "qcInspectionId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImsStockMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ImsQcInspection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "storeType" "ImsStoreType" NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "status" "ImsQcStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "inspectedById" TEXT,
    "inspectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImsQcInspection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ImsItem_organizationId_code_key" ON "ImsItem"("organizationId", "code");
CREATE INDEX IF NOT EXISTS "ImsItem_organizationId_itemType_isActive_idx" ON "ImsItem"("organizationId", "itemType", "isActive");
CREATE UNIQUE INDEX IF NOT EXISTS "ImsStockBalance_organizationId_itemId_storeType_bucket_key" ON "ImsStockBalance"("organizationId", "itemId", "storeType", "bucket");
CREATE INDEX IF NOT EXISTS "ImsStockBalance_organizationId_storeType_idx" ON "ImsStockBalance"("organizationId", "storeType");
CREATE UNIQUE INDEX IF NOT EXISTS "ImsStockMovement_qcInspectionId_key" ON "ImsStockMovement"("qcInspectionId");
CREATE INDEX IF NOT EXISTS "ImsStockMovement_organizationId_createdAt_idx" ON "ImsStockMovement"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "ImsStockMovement_itemId_createdAt_idx" ON "ImsStockMovement"("itemId", "createdAt");
CREATE INDEX IF NOT EXISTS "ImsQcInspection_organizationId_status_idx" ON "ImsQcInspection"("organizationId", "status");

-- AddForeignKey (idempotent)
DO $$ BEGIN
  ALTER TABLE "ImsItem" ADD CONSTRAINT "ImsItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ImsStockBalance" ADD CONSTRAINT "ImsStockBalance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ImsStockBalance" ADD CONSTRAINT "ImsStockBalance_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ImsItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ImsStockMovement" ADD CONSTRAINT "ImsStockMovement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ImsStockMovement" ADD CONSTRAINT "ImsStockMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ImsItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ImsStockMovement" ADD CONSTRAINT "ImsStockMovement_qcInspectionId_fkey" FOREIGN KEY ("qcInspectionId") REFERENCES "ImsQcInspection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ImsStockMovement" ADD CONSTRAINT "ImsStockMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ImsQcInspection" ADD CONSTRAINT "ImsQcInspection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ImsQcInspection" ADD CONSTRAINT "ImsQcInspection_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ImsItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ImsQcInspection" ADD CONSTRAINT "ImsQcInspection_inspectedById_fkey" FOREIGN KEY ("inspectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
