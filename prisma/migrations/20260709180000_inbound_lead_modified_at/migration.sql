ALTER TABLE "InboundLead" ADD COLUMN "modifiedAt" TIMESTAMP(3);

CREATE INDEX "InboundLead_organizationId_modifiedAt_idx"
  ON "InboundLead"("organizationId", "modifiedAt");
