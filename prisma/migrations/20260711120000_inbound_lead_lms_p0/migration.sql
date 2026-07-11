-- CreateEnum
CREATE TYPE "LeadTemperature" AS ENUM ('HOT', 'WARM', 'COLD');

-- AlterTable
ALTER TABLE "InboundLead" ADD COLUMN     "score" INTEGER,
ADD COLUMN     "temperature" "LeadTemperature",
ADD COLUMN     "utmSource" TEXT,
ADD COLUMN     "utmMedium" TEXT,
ADD COLUMN     "utmCampaign" TEXT,
ADD COLUMN     "utmContent" TEXT,
ADD COLUMN     "utmTerm" TEXT,
ADD COLUMN     "campaign" TEXT,
ADD COLUMN     "landingPage" TEXT,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "createdByUserId" TEXT;

-- CreateIndex
CREATE INDEX "InboundLead_organizationId_phone_idx" ON "InboundLead"("organizationId", "phone");

-- CreateIndex
CREATE INDEX "InboundLead_organizationId_email_idx" ON "InboundLead"("organizationId", "email");

-- CreateIndex
CREATE INDEX "InboundLead_organizationId_archivedAt_idx" ON "InboundLead"("organizationId", "archivedAt");

-- AddForeignKey
ALTER TABLE "InboundLead" ADD CONSTRAINT "InboundLead_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
