-- CreateTable
CREATE TABLE "LegalCaseImportBackup" (
    "organizationId" TEXT NOT NULL,
    "caseCount" INTEGER NOT NULL,
    "sourceFilename" TEXT,
    "payload" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalCaseImportBackup_pkey" PRIMARY KEY ("organizationId")
);

-- AddForeignKey
ALTER TABLE "LegalCaseImportBackup" ADD CONSTRAINT "LegalCaseImportBackup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
