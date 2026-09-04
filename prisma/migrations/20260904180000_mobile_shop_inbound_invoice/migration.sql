-- AlterTable
ALTER TABLE "MobileShopItem" ADD COLUMN "color" TEXT;
CREATE INDEX "MobileShopItem_organizationId_brand_model_idx" ON "MobileShopItem"("organizationId", "brand", "model");

-- AlterTable
ALTER TABLE "MobileShopMovement" ADD COLUMN "inboundId" TEXT;

-- CreateTable
CREATE TABLE "MobileShopInbound" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3),
    "supplier" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileShopInbound_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MobileShopInboundLine" (
    "id" TEXT NOT NULL,
    "inboundId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileShopInboundLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MobileShopInbound_organizationId_createdAt_idx" ON "MobileShopInbound"("organizationId", "createdAt");
CREATE INDEX "MobileShopInbound_organizationId_invoiceNo_idx" ON "MobileShopInbound"("organizationId", "invoiceNo");
CREATE INDEX "MobileShopInboundLine_inboundId_idx" ON "MobileShopInboundLine"("inboundId");
CREATE INDEX "MobileShopInboundLine_itemId_idx" ON "MobileShopInboundLine"("itemId");
CREATE INDEX "MobileShopMovement_inboundId_idx" ON "MobileShopMovement"("inboundId");

ALTER TABLE "MobileShopInbound" ADD CONSTRAINT "MobileShopInbound_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MobileShopInboundLine" ADD CONSTRAINT "MobileShopInboundLine_inboundId_fkey" FOREIGN KEY ("inboundId") REFERENCES "MobileShopInbound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MobileShopInboundLine" ADD CONSTRAINT "MobileShopInboundLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MobileShopItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MobileShopMovement" ADD CONSTRAINT "MobileShopMovement_inboundId_fkey" FOREIGN KEY ("inboundId") REFERENCES "MobileShopInbound"("id") ON DELETE SET NULL ON UPDATE CASCADE;
