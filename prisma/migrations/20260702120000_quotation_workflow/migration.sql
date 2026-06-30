-- Quotation workflow: status, revisions, share link, lock on advance

CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'REVISED', 'LOCKED');

ALTER TABLE "InboundLeadQuotation" ADD COLUMN "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "InboundLeadQuotation" ADD COLUMN "revisionNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "InboundLeadQuotation" ADD COLUMN "revisedFromQuotationId" TEXT;
ALTER TABLE "InboundLeadQuotation" ADD COLUMN "shareToken" TEXT;
ALTER TABLE "InboundLeadQuotation" ADD COLUMN "advanceRequired" DECIMAL(14,2);
ALTER TABLE "InboundLeadQuotation" ADD COLUMN "scopeNotes" TEXT;
ALTER TABLE "InboundLeadQuotation" ADD COLUMN "paymentTerms" TEXT;
ALTER TABLE "InboundLeadQuotation" ADD COLUMN "lockedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "InboundLeadQuotation_shareToken_key" ON "InboundLeadQuotation"("shareToken");
CREATE INDEX "InboundLeadQuotation_shareToken_idx" ON "InboundLeadQuotation"("shareToken");

ALTER TABLE "InboundLeadQuotation" ADD CONSTRAINT "InboundLeadQuotation_revisedFromQuotationId_fkey"
  FOREIGN KEY ("revisedFromQuotationId") REFERENCES "InboundLeadQuotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
