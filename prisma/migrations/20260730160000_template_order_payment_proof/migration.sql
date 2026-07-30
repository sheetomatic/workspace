-- Buyer-submitted payment confirmation (UTR + screenshot) on template orders
ALTER TABLE "TemplateOrder" ADD COLUMN "paymentClaimedAt" TIMESTAMP(3);
ALTER TABLE "TemplateOrder" ADD COLUMN "paymentProofFileName" TEXT;
ALTER TABLE "TemplateOrder" ADD COLUMN "paymentProofMimeType" TEXT;
ALTER TABLE "TemplateOrder" ADD COLUMN "paymentProofSize" INTEGER;
ALTER TABLE "TemplateOrder" ADD COLUMN "paymentProofData" BYTEA;
