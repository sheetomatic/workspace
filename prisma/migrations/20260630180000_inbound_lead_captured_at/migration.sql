ALTER TABLE "InboundLead" ADD COLUMN "capturedAt" TIMESTAMP(3);

CREATE INDEX "InboundLead_organizationId_capturedAt_idx"
  ON "InboundLead"("organizationId", "capturedAt");
