-- HRMS v1: formal offer letters (draft → send → accept/decline)
CREATE TYPE "OfferLetterStatus" AS ENUM (
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
  'WITHDRAWN'
);

CREATE TABLE "OfferLetter" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "jobOpeningId" TEXT,
  "roleTitle" TEXT NOT NULL,
  "department" TEXT,
  "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
  "ctcAnnual" DECIMAL(14,2),
  "ctcMonthly" DECIMAL(14,2),
  "joiningDate" TIMESTAMP(3),
  "probationMonths" INTEGER NOT NULL DEFAULT 6,
  "offerValidUntil" TIMESTAMP(3),
  "workLocation" TEXT,
  "reportingTo" TEXT,
  "benefitsNotes" TEXT,
  "bodyHtml" TEXT NOT NULL,
  "status" "OfferLetterStatus" NOT NULL DEFAULT 'DRAFT',
  "shareToken" TEXT,
  "sentAt" TIMESTAMP(3),
  "sentVia" TEXT,
  "acceptedAt" TIMESTAMP(3),
  "declinedAt" TIMESTAMP(3),
  "declineReason" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OfferLetter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OfferLetter_shareToken_key" ON "OfferLetter"("shareToken");
CREATE INDEX "OfferLetter_organizationId_status_idx" ON "OfferLetter"("organizationId", "status");
CREATE INDEX "OfferLetter_candidateId_idx" ON "OfferLetter"("candidateId");
CREATE INDEX "OfferLetter_organizationId_createdAt_idx" ON "OfferLetter"("organizationId", "createdAt");

ALTER TABLE "OfferLetter"
  ADD CONSTRAINT "OfferLetter_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OfferLetter"
  ADD CONSTRAINT "OfferLetter_candidateId_fkey"
  FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OfferLetter"
  ADD CONSTRAINT "OfferLetter_jobOpeningId_fkey"
  FOREIGN KEY ("jobOpeningId") REFERENCES "JobOpening"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OfferLetter"
  ADD CONSTRAINT "OfferLetter_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
