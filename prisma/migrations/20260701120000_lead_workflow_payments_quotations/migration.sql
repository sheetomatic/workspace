-- Extend lead workflow status enum
ALTER TYPE "InboundLeadStatus" ADD VALUE IF NOT EXISTS 'SCHEDULE_MEETING';
ALTER TYPE "InboundLeadStatus" ADD VALUE IF NOT EXISTS 'MEETING_NOTES';
ALTER TYPE "InboundLeadStatus" ADD VALUE IF NOT EXISTS 'PROPOSAL_INVOICE';
ALTER TYPE "InboundLeadStatus" ADD VALUE IF NOT EXISTS 'PAYMENT';
ALTER TYPE "InboundLeadStatus" ADD VALUE IF NOT EXISTS 'PROJECT_ACTIVE';

-- Activity types
ALTER TYPE "InboundLeadActivityType" ADD VALUE IF NOT EXISTS 'MEETING';
ALTER TYPE "InboundLeadActivityType" ADD VALUE IF NOT EXISTS 'PAYMENT';

-- New enums
CREATE TYPE "LeadCallingStatus" AS ENUM (
  'NOT_CALLED',
  'CALLING',
  'NO_ANSWER',
  'CONNECTED',
  'NOT_INTERESTED'
);

CREATE TYPE "LeadProjectStatus" AS ENUM (
  'NOT_STARTED',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE "LeadPaymentType" AS ENUM (
  'ADVANCE',
  'PARTIAL',
  'FULL',
  'TRAINING_FEE',
  'WHATSAPP_API_SETUP',
  'WHATSAPP_API_RECHARGE',
  'YOUTUBE_ADSENSE',
  'COURSE_FEE'
);

CREATE TYPE "LeadPaymentMethod" AS ENUM (
  'BANK_TRANSFER',
  'CASH_DEPOSIT',
  'UPI'
);

CREATE TYPE "QuotationRequestType" AS ENUM ('PROPOSAL', 'INVOICE');

-- Lead fields
ALTER TABLE "InboundLead"
  ADD COLUMN "company" TEXT,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "zipCode" TEXT,
  ADD COLUMN "meetingNotes" TEXT,
  ADD COLUMN "callingStatus" "LeadCallingStatus" NOT NULL DEFAULT 'NOT_CALLED',
  ADD COLUMN "projectStatus" "LeadProjectStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "aiSuggestedStatus" "InboundLeadStatus";

CREATE TABLE "LeadServiceCatalog" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "serviceCategory" TEXT NOT NULL,
  "subCategory" TEXT NOT NULL,
  "unitPrice" DECIMAL(14, 2),
  "durationDays" INTEGER,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeadServiceCatalog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeadServiceCatalog_organizationId_serviceCategory_subCategory_key"
  ON "LeadServiceCatalog"("organizationId", "serviceCategory", "subCategory");
CREATE INDEX "LeadServiceCatalog_organizationId_serviceCategory_idx"
  ON "LeadServiceCatalog"("organizationId", "serviceCategory");

CREATE TABLE "InboundLeadOfferedService" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "catalogId" TEXT,
  "serviceCategory" TEXT NOT NULL,
  "subCategory" TEXT NOT NULL,
  "unitPrice" DECIMAL(14, 2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InboundLeadOfferedService_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InboundLeadOfferedService_leadId_idx" ON "InboundLeadOfferedService"("leadId");
CREATE INDEX "InboundLeadOfferedService_organizationId_leadId_idx"
  ON "InboundLeadOfferedService"("organizationId", "leadId");

CREATE TABLE "InboundLeadPayment" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "paymentType" "LeadPaymentType" NOT NULL,
  "receivedAmount" DECIMAL(14, 2) NOT NULL,
  "receivedDate" TIMESTAMP(3) NOT NULL,
  "paymentMethod" "LeadPaymentMethod" NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InboundLeadPayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InboundLeadPayment_organizationId_leadId_receivedDate_idx"
  ON "InboundLeadPayment"("organizationId", "leadId", "receivedDate");
CREATE INDEX "InboundLeadPayment_leadId_idx" ON "InboundLeadPayment"("leadId");

CREATE TABLE "InboundLeadQuotation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "quotationNumber" TEXT NOT NULL,
  "requestType" "QuotationRequestType" NOT NULL DEFAULT 'PROPOSAL',
  "company" TEXT,
  "address" TEXT,
  "zipCode" TEXT,
  "quotationDate" TIMESTAMP(3) NOT NULL,
  "projectStartDate" TIMESTAMP(3),
  "durationDays" INTEGER,
  "endDate" TIMESTAMP(3),
  "subtotal" DECIMAL(14, 2) NOT NULL,
  "taxAmount" DECIMAL(14, 2),
  "totalAmount" DECIMAL(14, 2) NOT NULL,
  "notes" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InboundLeadQuotation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InboundLeadQuotation_organizationId_quotationNumber_key"
  ON "InboundLeadQuotation"("organizationId", "quotationNumber");
CREATE INDEX "InboundLeadQuotation_organizationId_leadId_idx"
  ON "InboundLeadQuotation"("organizationId", "leadId");
CREATE INDEX "InboundLeadQuotation_leadId_idx" ON "InboundLeadQuotation"("leadId");

CREATE TABLE "InboundLeadQuotationLine" (
  "id" TEXT NOT NULL,
  "quotationId" TEXT NOT NULL,
  "serviceCategory" TEXT NOT NULL,
  "subCategory" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" DECIMAL(14, 2) NOT NULL,
  "lineTotal" DECIMAL(14, 2) NOT NULL,
  CONSTRAINT "InboundLeadQuotationLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InboundLeadQuotationLine_quotationId_idx"
  ON "InboundLeadQuotationLine"("quotationId");

ALTER TABLE "LeadServiceCatalog"
  ADD CONSTRAINT "LeadServiceCatalog_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InboundLeadOfferedService"
  ADD CONSTRAINT "InboundLeadOfferedService_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "InboundLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InboundLeadOfferedService"
  ADD CONSTRAINT "InboundLeadOfferedService_catalogId_fkey"
  FOREIGN KEY ("catalogId") REFERENCES "LeadServiceCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InboundLeadPayment"
  ADD CONSTRAINT "InboundLeadPayment_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InboundLeadPayment"
  ADD CONSTRAINT "InboundLeadPayment_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "InboundLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InboundLeadQuotation"
  ADD CONSTRAINT "InboundLeadQuotation_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InboundLeadQuotation"
  ADD CONSTRAINT "InboundLeadQuotation_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "InboundLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InboundLeadQuotation"
  ADD CONSTRAINT "InboundLeadQuotation_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InboundLeadQuotationLine"
  ADD CONSTRAINT "InboundLeadQuotationLine_quotationId_fkey"
  FOREIGN KEY ("quotationId") REFERENCES "InboundLeadQuotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
