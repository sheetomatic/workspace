-- Native IMS purchase orders (MR → Indent → PO → GRN chain)

CREATE TYPE "ImsPurchaseOrderStatus" AS ENUM (
  'DRAFT',
  'PENDING',
  'APPROVED',
  'SENT',
  'CLOSED',
  'CANCELLED'
);

CREATE TABLE "ImsPurchaseOrder" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "poNumber" TEXT NOT NULL,
  "status" "ImsPurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "indentId" TEXT,
  "vendorId" TEXT,
  "siteName" TEXT,
  "expectedDeliveryDate" TIMESTAMP(3),
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ImsPurchaseOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ImsPurchaseOrder_organizationId_poNumber_key"
  ON "ImsPurchaseOrder"("organizationId", "poNumber");
CREATE INDEX "ImsPurchaseOrder_organizationId_status_idx"
  ON "ImsPurchaseOrder"("organizationId", "status");
CREATE INDEX "ImsPurchaseOrder_organizationId_indentId_idx"
  ON "ImsPurchaseOrder"("organizationId", "indentId");

ALTER TABLE "ImsPurchaseOrder"
  ADD CONSTRAINT "ImsPurchaseOrder_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImsPurchaseOrder"
  ADD CONSTRAINT "ImsPurchaseOrder_indentId_fkey"
  FOREIGN KEY ("indentId") REFERENCES "ImsIndent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ImsPurchaseOrder"
  ADD CONSTRAINT "ImsPurchaseOrder_vendorId_fkey"
  FOREIGN KEY ("vendorId") REFERENCES "ImsVendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ImsPurchaseOrder"
  ADD CONSTRAINT "ImsPurchaseOrder_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImsPurchaseOrder"
  ADD CONSTRAINT "ImsPurchaseOrder_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ImsPurchaseOrderLine" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "quantity" DECIMAL(18,4) NOT NULL,
  "rate" DECIMAL(18,4),
  "notes" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "ImsPurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImsPurchaseOrderLine_purchaseOrderId_idx"
  ON "ImsPurchaseOrderLine"("purchaseOrderId");
CREATE INDEX "ImsPurchaseOrderLine_organizationId_itemId_idx"
  ON "ImsPurchaseOrderLine"("organizationId", "itemId");

ALTER TABLE "ImsPurchaseOrderLine"
  ADD CONSTRAINT "ImsPurchaseOrderLine_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImsPurchaseOrderLine"
  ADD CONSTRAINT "ImsPurchaseOrderLine_purchaseOrderId_fkey"
  FOREIGN KEY ("purchaseOrderId") REFERENCES "ImsPurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImsPurchaseOrderLine"
  ADD CONSTRAINT "ImsPurchaseOrderLine_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "ImsItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
