-- AlterEnum
ALTER TYPE "LeadSourceChannel" ADD VALUE 'GOOGLE_CALENDAR';

-- AlterTable
ALTER TABLE "InboundLeadFollowUp"
ADD COLUMN "externalSource" TEXT,
ADD COLUMN "externalId" TEXT,
ADD COLUMN "externalUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "InboundLeadFollowUp_organizationId_externalSource_externalId_key"
ON "InboundLeadFollowUp"("organizationId", "externalSource", "externalId");
