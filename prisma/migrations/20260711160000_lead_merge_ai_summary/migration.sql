-- Lead merge history + cached AI qualification summary (LMS PDF follow-up batch)
ALTER TABLE "InboundLead" ADD COLUMN IF NOT EXISTS "mergedIntoId" TEXT;
ALTER TABLE "InboundLead" ADD COLUMN IF NOT EXISTS "aiSummary" TEXT;
ALTER TABLE "InboundLead" ADD COLUMN IF NOT EXISTS "aiSummaryAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "InboundLead_organizationId_mergedIntoId_idx"
  ON "InboundLead"("organizationId", "mergedIntoId");

DO $$ BEGIN
  ALTER TABLE "InboundLead"
    ADD CONSTRAINT "InboundLead_mergedIntoId_fkey"
    FOREIGN KEY ("mergedIntoId") REFERENCES "InboundLead"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
