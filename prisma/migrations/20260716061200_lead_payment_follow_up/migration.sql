-- CRM Payment Follow-up: Total / Received / Last date (Due is computed in app)
ALTER TABLE "InboundLead" ADD COLUMN IF NOT EXISTS "paymentFollowUp" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "InboundLead" ADD COLUMN IF NOT EXISTS "paymentTotal" DECIMAL(14,2);
ALTER TABLE "InboundLead" ADD COLUMN IF NOT EXISTS "paymentReceived" DECIMAL(14,2);
ALTER TABLE "InboundLead" ADD COLUMN IF NOT EXISTS "paymentLastDate" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "InboundLead_organizationId_paymentFollowUp_paymentLastDate_idx"
  ON "InboundLead"("organizationId", "paymentFollowUp", "paymentLastDate");
