-- Item groups master
CREATE TABLE "ImsItemGroup" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "parentId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ImsItemGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ImsItemGroup_organizationId_name_key"
  ON "ImsItemGroup"("organizationId", "name");
CREATE INDEX "ImsItemGroup_organizationId_parentId_idx"
  ON "ImsItemGroup"("organizationId", "parentId");

ALTER TABLE "ImsItemGroup"
  ADD CONSTRAINT "ImsItemGroup_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImsItemGroup"
  ADD CONSTRAINT "ImsItemGroup_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "ImsItemGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ImsItem" ADD COLUMN "groupId" TEXT;
CREATE INDEX "ImsItem_organizationId_groupId_idx" ON "ImsItem"("organizationId", "groupId");
ALTER TABLE "ImsItem"
  ADD CONSTRAINT "ImsItem_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "ImsItemGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TYPE "ImsRequisitionStatus" AS ENUM (
  'DRAFT',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CLOSED'
);

CREATE TABLE "ImsMaterialRequisition" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "requisitionNumber" TEXT NOT NULL,
  "status" "ImsRequisitionStatus" NOT NULL DEFAULT 'DRAFT',
  "siteName" TEXT,
  "department" TEXT,
  "purpose" TEXT,
  "notes" TEXT,
  "requestedById" TEXT NOT NULL,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ImsMaterialRequisition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ImsMaterialRequisition_organizationId_requisitionNumber_key"
  ON "ImsMaterialRequisition"("organizationId", "requisitionNumber");
CREATE INDEX "ImsMaterialRequisition_organizationId_status_idx"
  ON "ImsMaterialRequisition"("organizationId", "status");
CREATE INDEX "ImsMaterialRequisition_organizationId_createdAt_idx"
  ON "ImsMaterialRequisition"("organizationId", "createdAt");

ALTER TABLE "ImsMaterialRequisition"
  ADD CONSTRAINT "ImsMaterialRequisition_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImsMaterialRequisition"
  ADD CONSTRAINT "ImsMaterialRequisition_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImsMaterialRequisition"
  ADD CONSTRAINT "ImsMaterialRequisition_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ImsMaterialRequisitionLine" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "requisitionId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "quantityRequested" DECIMAL(18,4) NOT NULL,
  "quantityApproved" DECIMAL(18,4),
  "notes" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "ImsMaterialRequisitionLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImsMaterialRequisitionLine_requisitionId_idx"
  ON "ImsMaterialRequisitionLine"("requisitionId");
CREATE INDEX "ImsMaterialRequisitionLine_organizationId_itemId_idx"
  ON "ImsMaterialRequisitionLine"("organizationId", "itemId");

ALTER TABLE "ImsMaterialRequisitionLine"
  ADD CONSTRAINT "ImsMaterialRequisitionLine_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImsMaterialRequisitionLine"
  ADD CONSTRAINT "ImsMaterialRequisitionLine_requisitionId_fkey"
  FOREIGN KEY ("requisitionId") REFERENCES "ImsMaterialRequisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImsMaterialRequisitionLine"
  ADD CONSTRAINT "ImsMaterialRequisitionLine_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "ImsItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
