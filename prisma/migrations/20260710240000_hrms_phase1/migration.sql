-- HRMS Phase 1: onboarding docs, location mode, holidays, leave policy, OD/WFH

DO $$ BEGIN
  CREATE TYPE "EmployeeLocationMode" AS ENUM ('FIXED_SITE', 'FLEXIBLE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AttendanceExceptionType" AS ENUM ('OD', 'WFH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "EmployeeOnboardingStatus" AS ENUM ('PENDING_DOCS', 'COMPLETE', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TYPE "EmployeeDocumentType" ADD VALUE IF NOT EXISTS 'EDUCATION_QUALIFICATION';
ALTER TYPE "EmployeeDocumentType" ADD VALUE IF NOT EXISTS 'CV';
ALTER TYPE "EmployeeDocumentType" ADD VALUE IF NOT EXISTS 'WORK_EXPERIENCE';
ALTER TYPE "EmployeeDocumentType" ADD VALUE IF NOT EXISTS 'NOC_RESIGNATION';

ALTER TABLE "Invitation"
  ADD COLUMN IF NOT EXISTS "reportingManagerId" TEXT,
  ADD COLUMN IF NOT EXISTS "department" "TaskDepartment",
  ADD COLUMN IF NOT EXISTS "designation" TEXT,
  ADD COLUMN IF NOT EXISTS "requireOnboarding" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP(3);

ALTER TABLE "Membership"
  ADD COLUMN IF NOT EXISTS "locationMode" "EmployeeLocationMode" NOT NULL DEFAULT 'FIXED_SITE',
  ADD COLUMN IF NOT EXISTS "primarySiteId" TEXT;

CREATE INDEX IF NOT EXISTS "Membership_primarySiteId_idx" ON "Membership"("primarySiteId");

DO $$ BEGIN
  ALTER TABLE "Membership" ADD CONSTRAINT "Membership_primarySiteId_fkey"
    FOREIGN KEY ("primarySiteId") REFERENCES "HrWorkSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "EmployeeProfile"
  ADD COLUMN IF NOT EXISTS "onboardingStatus" "EmployeeOnboardingStatus" NOT NULL DEFAULT 'COMPLETE',
  ADD COLUMN IF NOT EXISTS "educationSummary" TEXT,
  ADD COLUMN IF NOT EXISTS "experienceSummary" TEXT;

CREATE INDEX IF NOT EXISTS "EmployeeProfile_organizationId_onboardingStatus_idx"
  ON "EmployeeProfile"("organizationId", "onboardingStatus");

CREATE TABLE IF NOT EXISTS "HrHoliday" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrHoliday_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HrHoliday_organizationId_date_key" ON "HrHoliday"("organizationId", "date");
CREATE INDEX IF NOT EXISTS "HrHoliday_organizationId_date_idx" ON "HrHoliday"("organizationId", "date");

DO $$ BEGIN
  ALTER TABLE "HrHoliday" ADD CONSTRAINT "HrHoliday_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "LeavePolicy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "year" INTEGER NOT NULL,
    "defaultDays" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeavePolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LeavePolicy_organizationId_leaveType_year_key"
  ON "LeavePolicy"("organizationId", "leaveType", "year");
CREATE INDEX IF NOT EXISTS "LeavePolicy_organizationId_year_idx" ON "LeavePolicy"("organizationId", "year");

DO $$ BEGIN
  ALTER TABLE "LeavePolicy" ADD CONSTRAINT "LeavePolicy_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "AttendanceExceptionRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exceptionType" "AttendanceExceptionType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "reason" TEXT,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceExceptionRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AttendanceExceptionRequest_organizationId_status_idx"
  ON "AttendanceExceptionRequest"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "AttendanceExceptionRequest_organizationId_userId_idx"
  ON "AttendanceExceptionRequest"("organizationId", "userId");

DO $$ BEGIN
  ALTER TABLE "AttendanceExceptionRequest" ADD CONSTRAINT "AttendanceExceptionRequest_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AttendanceExceptionRequest" ADD CONSTRAINT "AttendanceExceptionRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AttendanceExceptionRequest" ADD CONSTRAINT "AttendanceExceptionRequest_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
