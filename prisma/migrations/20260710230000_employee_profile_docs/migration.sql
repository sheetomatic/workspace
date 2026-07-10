-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'EXITED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "EmployeeDocumentType" AS ENUM ('AADHAAR', 'PAN', 'OFFER_LETTER', 'CONTRACT', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "EmployeeProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "phone" TEXT,
    "emergencyContact" TEXT,
    "address" TEXT,
    "dateOfBirth" DATE,
    "gender" TEXT,
    "pan" TEXT,
    "aadhaar" TEXT,
    "aadhaarLast4" TEXT,
    "basic" DECIMAL(14,2),
    "hra" DECIMAL(14,2),
    "specialAllowance" DECIMAL(14,2),
    "esiApplicable" BOOLEAN NOT NULL DEFAULT false,
    "esiNumber" TEXT,
    "pfApplicable" BOOLEAN NOT NULL DEFAULT false,
    "uan" TEXT,
    "pfNumber" TEXT,
    "taxRegime" TEXT,
    "tdsMonthly" DECIMAL(14,2),
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "ifsc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmployeeProfile_membershipId_key" ON "EmployeeProfile"("membershipId");
CREATE UNIQUE INDEX IF NOT EXISTS "EmployeeProfile_organizationId_employeeCode_key" ON "EmployeeProfile"("organizationId", "employeeCode");
CREATE INDEX IF NOT EXISTS "EmployeeProfile_organizationId_userId_idx" ON "EmployeeProfile"("organizationId", "userId");
CREATE INDEX IF NOT EXISTS "EmployeeProfile_organizationId_status_idx" ON "EmployeeProfile"("organizationId", "status");

DO $$ BEGIN
  ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "EmployeeDocument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeProfileId" TEXT NOT NULL,
    "docType" "EmployeeDocumentType" NOT NULL DEFAULT 'OTHER',
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EmployeeDocument_employeeProfileId_idx" ON "EmployeeDocument"("employeeProfileId");
CREATE INDEX IF NOT EXISTS "EmployeeDocument_organizationId_employeeProfileId_idx" ON "EmployeeDocument"("organizationId", "employeeProfileId");

DO $$ BEGIN
  ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_employeeProfileId_fkey" FOREIGN KEY ("employeeProfileId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
