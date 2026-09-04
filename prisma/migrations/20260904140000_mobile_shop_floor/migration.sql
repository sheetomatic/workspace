-- CreateEnum
CREATE TYPE "MobileShopItemKind" AS ENUM ('PHONE', 'ACCESSORY', 'PART');
CREATE TYPE "MobileShopPhoneCondition" AS ENUM ('NEW', 'USED', 'REFURBISHED');
CREATE TYPE "MobileShopMovementKind" AS ENUM ('STOCK_IN', 'STOCK_OUT', 'SALE', 'PART_TO_REPAIR');
CREATE TYPE "MobileShopRepairStatus" AS ENUM ('RECEIVED', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "MobileShopItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "MobileShopItemKind" NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "imei" TEXT,
    "condition" "MobileShopPhoneCondition",
    "qty" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileShopItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MobileShopRepair" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "MobileShopRepairStatus" NOT NULL DEFAULT 'RECEIVED',
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "imei" TEXT,
    "jobType" TEXT NOT NULL,
    "complaint" TEXT,
    "promisedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileShopRepair_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MobileShopMovement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "kind" "MobileShopMovementKind" NOT NULL,
    "qty" INTEGER NOT NULL,
    "amountPaise" INTEGER NOT NULL DEFAULT 0,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "notes" TEXT,
    "repairId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileShopMovement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MobileShopItem_organizationId_imei_key" ON "MobileShopItem"("organizationId", "imei") WHERE "imei" IS NOT NULL;
CREATE INDEX "MobileShopItem_organizationId_kind_idx" ON "MobileShopItem"("organizationId", "kind");
CREATE INDEX "MobileShopItem_organizationId_imei_idx" ON "MobileShopItem"("organizationId", "imei");
CREATE INDEX "MobileShopRepair_organizationId_status_idx" ON "MobileShopRepair"("organizationId", "status");
CREATE INDEX "MobileShopRepair_organizationId_createdAt_idx" ON "MobileShopRepair"("organizationId", "createdAt");
CREATE INDEX "MobileShopMovement_organizationId_createdAt_idx" ON "MobileShopMovement"("organizationId", "createdAt");
CREATE INDEX "MobileShopMovement_itemId_createdAt_idx" ON "MobileShopMovement"("itemId", "createdAt");
CREATE INDEX "MobileShopMovement_repairId_idx" ON "MobileShopMovement"("repairId");

ALTER TABLE "MobileShopItem" ADD CONSTRAINT "MobileShopItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MobileShopRepair" ADD CONSTRAINT "MobileShopRepair_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MobileShopMovement" ADD CONSTRAINT "MobileShopMovement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MobileShopMovement" ADD CONSTRAINT "MobileShopMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MobileShopItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MobileShopMovement" ADD CONSTRAINT "MobileShopMovement_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES "MobileShopRepair"("id") ON DELETE SET NULL ON UPDATE CASCADE;
