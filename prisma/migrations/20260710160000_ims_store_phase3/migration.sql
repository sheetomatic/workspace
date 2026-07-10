-- Phase 3: physical stock count, gate pass, wastage movement types

ALTER TYPE "ImsMovementType" ADD VALUE IF NOT EXISTS 'WASTAGE';
ALTER TYPE "ImsMovementType" ADD VALUE IF NOT EXISTS 'GATE_PASS';

CREATE TYPE "ImsStockCountStatus" AS ENUM ('DRAFT', 'POSTED');

CREATE TYPE "ImsGatePassStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED');

CREATE TABLE "ImsPhysicalStockCount" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "countNumber" TEXT NOT NULL,
  "status" "ImsStockCountStatus" NOT NULL DEFAULT 'DRAFT',
  "siteName" TEXT,
  "notes" TEXT,
  "countedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT NOT NULL,
  "postedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ImsPhysicalStockCount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ImsPhysicalStockCount_organizationId_countNumber_key"
  ON "ImsPhysicalStockCount"("organizationId", "countNumber");
CREATE INDEX "ImsPhysicalStockCount_organizationId_status_idx"
  ON "ImsPhysicalStockCount"("organizationId", "status");

ALTER TABLE "ImsPhysicalStockCount"
  ADD CONSTRAINT "ImsPhysicalStockCount_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImsPhysicalStockCount"
  ADD CONSTRAINT "ImsPhysicalStockCount_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ImsPhysicalStockCountLine" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "countId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "systemQty" DECIMAL(18,4) NOT NULL,
  "physicalQty" DECIMAL(18,4) NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ImsPhysicalStockCountLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImsPhysicalStockCountLine_countId_idx" ON "ImsPhysicalStockCountLine"("countId");
CREATE INDEX "ImsPhysicalStockCountLine_organizationId_itemId_idx"
  ON "ImsPhysicalStockCountLine"("organizationId", "itemId");

ALTER TABLE "ImsPhysicalStockCountLine"
  ADD CONSTRAINT "ImsPhysicalStockCountLine_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImsPhysicalStockCountLine"
  ADD CONSTRAINT "ImsPhysicalStockCountLine_countId_fkey"
  FOREIGN KEY ("countId") REFERENCES "ImsPhysicalStockCount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImsPhysicalStockCountLine"
  ADD CONSTRAINT "ImsPhysicalStockCountLine_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "ImsItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ImsGatePass" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "passNumber" TEXT NOT NULL,
  "status" "ImsGatePassStatus" NOT NULL DEFAULT 'DRAFT',
  "siteName" TEXT,
  "partyName" TEXT,
  "vehicleNo" TEXT,
  "purpose" TEXT,
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "issuedById" TEXT,
  "issuedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ImsGatePass_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ImsGatePass_organizationId_passNumber_key"
  ON "ImsGatePass"("organizationId", "passNumber");
CREATE INDEX "ImsGatePass_organizationId_status_idx"
  ON "ImsGatePass"("organizationId", "status");

ALTER TABLE "ImsGatePass"
  ADD CONSTRAINT "ImsGatePass_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImsGatePass"
  ADD CONSTRAINT "ImsGatePass_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImsGatePass"
  ADD CONSTRAINT "ImsGatePass_issuedById_fkey"
  FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ImsGatePassLine" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "gatePassId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "quantity" DECIMAL(18,4) NOT NULL,
  "notes" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ImsGatePassLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImsGatePassLine_gatePassId_idx" ON "ImsGatePassLine"("gatePassId");
CREATE INDEX "ImsGatePassLine_organizationId_itemId_idx"
  ON "ImsGatePassLine"("organizationId", "itemId");

ALTER TABLE "ImsGatePassLine"
  ADD CONSTRAINT "ImsGatePassLine_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImsGatePassLine"
  ADD CONSTRAINT "ImsGatePassLine_gatePassId_fkey"
  FOREIGN KEY ("gatePassId") REFERENCES "ImsGatePass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImsGatePassLine"
  ADD CONSTRAINT "ImsGatePassLine_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "ImsItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
