CREATE TYPE "InboundLeadActivityType" AS ENUM (
  'NOTE',
  'STATUS_CHANGE',
  'FOLLOW_UP',
  'QUOTATION',
  'CALL',
  'WHATSAPP',
  'EDIT',
  'SYNC'
);

ALTER TABLE "InboundLead"
  ADD COLUMN "category" TEXT,
  ADD COLUMN "pipeValue" DECIMAL(14, 2),
  ADD COLUMN "quotationValue" DECIMAL(14, 2),
  ADD COLUMN "discussionNotes" TEXT;

CREATE INDEX "InboundLead_organizationId_category_idx"
  ON "InboundLead"("organizationId", "category");

CREATE TABLE "InboundLeadActivity" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "type" "InboundLeadActivityType" NOT NULL,
  "body" TEXT,
  "metadata" JSONB,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InboundLeadActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InboundLeadActivity_organizationId_leadId_createdAt_idx"
  ON "InboundLeadActivity"("organizationId", "leadId", "createdAt");
CREATE INDEX "InboundLeadActivity_leadId_idx"
  ON "InboundLeadActivity"("leadId");

ALTER TABLE "InboundLeadActivity"
  ADD CONSTRAINT "InboundLeadActivity_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InboundLeadActivity"
  ADD CONSTRAINT "InboundLeadActivity_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "InboundLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InboundLeadActivity"
  ADD CONSTRAINT "InboundLeadActivity_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
