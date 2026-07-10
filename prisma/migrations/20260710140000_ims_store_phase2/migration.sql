-- Phase 2: Indents, rack sections, purchase bills

CREATE TYPE "ImsIndentStatus" AS ENUM (
  'DRAFT',
  'PENDING',
  'APPROVED',
  'CLOSED',
  'CANCELLED'
);

CREATE TYPE "ImsPurchaseBillStatus" AS ENUM (
  'DRAFT',
  'POSTED'
);

CREATE TABLE "ImsRackSection" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "siteName" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ImsRackSection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ImsRackSection_organizationId_code_key"
  ON "ImsRackSection"("organizationId", "code");
CREATE INDEX "ImsRackSection_organizationId_isActive_idx"
  ON "ImsRackSection"("organizationId", "isActive");

ALTER TABLE "ImsRackSection"
  ADD CONSTRAINT "ImsRackSection_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ImsItem" ADD COLUMN "rackSectionId" TEXT;
CREATE INDEX "ImsItem_organizationId_rackSectionId_idx" ON "ImsItem"("organizationId", "rackSectionId");
ALTER TABLE "ImsItem"
  ADD CONSTRAINT "ImsItem_rackSectionId_fkey"
  FOREIGN KEY ("rackSectionId") REFERENCES "ImsRackSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ImsIndent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "indentNumber" TEXT NOT NULL,
  "status" "ImsIndentStatus" NOT NULL DEFAULT 'DRAFT',
  "requisitionId" TEXT,
  "vendorId" TEXT,
  "siteName" TEXT,
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ImsIndent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ImsIndent_organizationId_indentNumber_key"
  ON "ImsIndent"("organizationId", "indentNumber");
CREATE INDEX "ImsIndent_organizationId_status_idx"
  ON "ImsIndent"("organizationId", "status");
CREATE INDEX "ImsIndent_organizationId_requisitionId_idx"
  ON "ImsIndent"("organizationId", "requisitionId");

ALTER TABLE "ImsIndent"
  ADD CONSTRAINT "ImsIndent_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImsIndent"
  ADD CONSTRAINT "ImsIndent_requisitionId_fkey"
  FOREIGN KEY ("requisitionId") REFERENCES "ImsMaterialRequisition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ImsIndent"
  ADD CONSTRAINT "ImsIndent_vendorId_fkey"
  FOREIGN KEY ("vendorId") REFERENCES "ImsVendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ImsIndent"
  ADD CONSTRAINT "ImsIndent_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImsIndent"
  ADD CONSTRAINT "ImsIndent_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ImsIndentLine" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "indentId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "quantity" DECIMAL(18,4) NOT NULL,
  "rate" DECIMAL(18,4),
  "notes" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "ImsIndentLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImsIndentLine_indentId_idx" ON "ImsIndentLine"("indentId");
CREATE INDEX "ImsIndentLine_organizationId_itemId_idx"
  ON "ImsIndentLine"("organizationId", "itemId");

ALTER TABLE "ImsIndentLine"
  ADD CONSTRAINT "ImsIndentLine_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImsIndentLine"
  ADD CONSTRAINT "ImsIndentLine_indentId_fkey"
  FOREIGN KEY ("indentId") REFERENCES "ImsIndent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImsIndentLine"
  ADD CONSTRAINT "ImsIndentLine_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "ImsItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ImsPurchaseBill" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "billNumber" TEXT NOT NULL,
  "status" "ImsPurchaseBillStatus" NOT NULL DEFAULT 'DRAFT',
  "vendorId" TEXT NOT NULL,
  "billDate" TIMESTAMP(3) NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "grnReference" TEXT,
  "invoiceNumber" TEXT,
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ImsPurchaseBill_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ImsPurchaseBill_organizationId_billNumber_key"
  ON "ImsPurchaseBill"("organizationId", "billNumber");
CREATE INDEX "ImsPurchaseBill_organizationId_billDate_idx"
  ON "ImsPurchaseBill"("organizationId", "billDate");
CREATE INDEX "ImsPurchaseBill_organizationId_vendorId_idx"
  ON "ImsPurchaseBill"("organizationId", "vendorId");

ALTER TABLE "ImsPurchaseBill"
  ADD CONSTRAINT "ImsPurchaseBill_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImsPurchaseBill"
  ADD CONSTRAINT "ImsPurchaseBill_vendorId_fkey"
  FOREIGN KEY ("vendorId") REFERENCES "ImsVendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImsPurchaseBill"
  ADD CONSTRAINT "ImsPurchaseBill_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
