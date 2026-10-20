-- Additive receipt review fields. Browser-submitted references never establish payment.
ALTER TABLE "TemplateCheckout"
  ADD COLUMN "paymentMode" TEXT NOT NULL DEFAULT 'gateway',
  ADD COLUMN "claimedPaymentRef" TEXT,
  ADD COLUMN "paymentClaimedAt" TIMESTAMP(3),
  ADD COLUMN "confirmedById" TEXT;
