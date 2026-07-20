-- CreateEnum
CREATE TYPE "InboundLeadFollowUpType" AS ENUM (
  'LEAD',
  'MEETING',
  'QUOTATION',
  'NEGOTIATION',
  'PAYMENT'
);

-- AlterTable
ALTER TABLE "InboundLeadFollowUp"
  ADD COLUMN "type" "InboundLeadFollowUpType" NOT NULL DEFAULT 'LEAD',
  ADD COLUMN "waNotifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "InboundLeadFollowUp_organizationId_type_scheduledAt_idx"
  ON "InboundLeadFollowUp"("organizationId", "type", "scheduledAt");
