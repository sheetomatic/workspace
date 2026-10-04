-- Seller GST identity for quotations and tax invoices.
ALTER TABLE "Organization" ADD COLUMN "quotationAccount" JSONB;
