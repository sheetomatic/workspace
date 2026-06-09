-- AlterEnum
ALTER TYPE "WorkspaceModule" ADD VALUE 'CASES';

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN "staffCode" TEXT;

-- CreateTable
CREATE TABLE "LegalCase" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fileNumber" TEXT NOT NULL,
    "mccNumber" TEXT,
    "caseRef" TEXT NOT NULL,
    "applicant" TEXT,
    "nonApplicant" TEXT,
    "category" TEXT,
    "caseStage" TEXT,
    "fileStatus" TEXT,
    "court" TEXT,
    "company" TEXT,
    "coAdvocate" TEXT,
    "prevDate" TEXT,
    "nextDate" TEXT,
    "remarks" TEXT,
    "amdCcStatus" TEXT,
    "fNo" TEXT,
    "clientAdvance" TEXT,
    "caseFiled" TEXT,
    "signingDate" TEXT,
    "s2Responsible" TEXT,
    "s3Responsible" TEXT,
    "s4Responsible" TEXT,
    "s5Responsible" TEXT,
    "s6Responsible" TEXT,
    "s7Responsible" TEXT,
    "sectionData" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalCaseDocument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "section" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalCaseDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalCase_organizationId_caseRef_key" ON "LegalCase"("organizationId", "caseRef");

-- CreateIndex
CREATE INDEX "LegalCase_organizationId_fileNumber_idx" ON "LegalCase"("organizationId", "fileNumber");

-- CreateIndex
CREATE INDEX "LegalCase_organizationId_fileStatus_idx" ON "LegalCase"("organizationId", "fileStatus");

-- CreateIndex
CREATE INDEX "LegalCase_organizationId_caseStage_idx" ON "LegalCase"("organizationId", "caseStage");

-- CreateIndex
CREATE INDEX "LegalCase_organizationId_applicant_idx" ON "LegalCase"("organizationId", "applicant");

-- CreateIndex
CREATE INDEX "LegalCaseDocument_caseId_section_category_idx" ON "LegalCaseDocument"("caseId", "section", "category");

-- CreateIndex
CREATE INDEX "LegalCaseDocument_organizationId_idx" ON "LegalCaseDocument"("organizationId");

-- AddForeignKey
ALTER TABLE "LegalCase" ADD CONSTRAINT "LegalCase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalCaseDocument" ADD CONSTRAINT "LegalCaseDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalCaseDocument" ADD CONSTRAINT "LegalCaseDocument_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "LegalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalCaseDocument" ADD CONSTRAINT "LegalCaseDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
