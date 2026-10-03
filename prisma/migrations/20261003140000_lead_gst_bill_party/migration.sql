-- GST bill-to party on the lead, and a snapshot on each quotation.
ALTER TABLE "InboundLead"
ADD COLUMN "billedTo" TEXT,
ADD COLUMN "gstin" TEXT,
ADD COLUMN "billedAddress" TEXT,
ADD COLUMN "billedCity" TEXT,
ADD COLUMN "billedStateCode" TEXT,
ADD COLUMN "billedPin" TEXT;

ALTER TABLE "InboundLeadQuotation"
ADD COLUMN "billedTo" TEXT,
ADD COLUMN "billedCity" TEXT,
ADD COLUMN "billedStateCode" TEXT;
