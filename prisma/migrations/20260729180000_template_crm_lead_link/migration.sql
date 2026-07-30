-- Template store: thumbnail + CRM lead fields

ALTER TABLE "TemplateProduct" ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT;

ALTER TABLE "TemplateOrder" ADD COLUMN IF NOT EXISTS "company" TEXT;
ALTER TABLE "TemplateOrder" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "TemplateOrder" ADD COLUMN IF NOT EXISTS "requirement" TEXT;
ALTER TABLE "TemplateOrder" ADD COLUMN IF NOT EXISTS "inboundLeadId" TEXT;

CREATE INDEX IF NOT EXISTS "TemplateOrder_inboundLeadId_status_idx" ON "TemplateOrder"("inboundLeadId", "status");
