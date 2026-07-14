-- CreateTable
CREATE TABLE "FieldCheckInAttachment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldCheckInAttachment_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "FieldCheckIn" ADD COLUMN "photoAttachmentId" TEXT;

-- CreateIndex
CREATE INDEX "FieldCheckInAttachment_organizationId_createdAt_idx" ON "FieldCheckInAttachment"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FieldCheckIn_photoAttachmentId_key" ON "FieldCheckIn"("photoAttachmentId");

-- AddForeignKey
ALTER TABLE "FieldCheckInAttachment" ADD CONSTRAINT "FieldCheckInAttachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldCheckInAttachment" ADD CONSTRAINT "FieldCheckInAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldCheckIn" ADD CONSTRAINT "FieldCheckIn_photoAttachmentId_fkey" FOREIGN KEY ("photoAttachmentId") REFERENCES "FieldCheckInAttachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
