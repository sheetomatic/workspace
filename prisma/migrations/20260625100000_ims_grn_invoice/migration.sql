-- CreateTable
CREATE TABLE "ImsAttachment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImsAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImsAttachment_organizationId_createdAt_idx" ON "ImsAttachment"("organizationId", "createdAt");

-- AlterTable
ALTER TABLE "ImsStockMovement"
    ADD COLUMN "quantityOrdered" DECIMAL(18,4),
    ADD COLUMN "poNumber" TEXT,
    ADD COLUMN "supplierName" TEXT,
    ADD COLUMN "invoiceNumber" TEXT,
    ADD COLUMN "invoiceDate" TIMESTAMP(3),
    ADD COLUMN "invoiceAmount" DECIMAL(18,2),
    ADD COLUMN "attachmentId" TEXT;

-- AddForeignKey
ALTER TABLE "ImsAttachment" ADD CONSTRAINT "ImsAttachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImsAttachment" ADD CONSTRAINT "ImsAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImsStockMovement" ADD CONSTRAINT "ImsStockMovement_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "ImsAttachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
