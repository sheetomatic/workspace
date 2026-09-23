ALTER TABLE "InboundLeadQuotation" ADD COLUMN IF NOT EXISTS "placeOfSupplyCode" TEXT;
ALTER TABLE "InboundLeadQuotation" ADD COLUMN IF NOT EXISTS "clientGstin" TEXT;
ALTER TABLE "InboundLeadQuotationLine" ADD COLUMN IF NOT EXISTS "hsnSac" TEXT;
ALTER TABLE "InboundLeadQuotationLine" ADD COLUMN IF NOT EXISTS "gstRate" INTEGER;
