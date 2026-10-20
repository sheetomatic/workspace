-- Additive payment reconciliation and fulfilment retry metadata. No existing orders are repriced.
ALTER TABLE "TemplateCheckout"
  ADD COLUMN "paymentState" TEXT NOT NULL DEFAULT 'creating',
  ADD COLUMN "emailLeaseUntil" TIMESTAMP(3),
  ADD COLUMN "emailAttemptedAt" TIMESTAMP(3);
UPDATE "TemplateCheckout" SET "paymentState" = CASE
  WHEN "paidAt" IS NOT NULL THEN 'paid'
  WHEN "gatewayOrderId" IS NOT NULL THEN 'ready'
  ELSE 'creating' END;
