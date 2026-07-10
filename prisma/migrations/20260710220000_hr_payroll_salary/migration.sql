-- AlterTable
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "monthlySalary" DECIMAL(14,2);
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "dateOfJoining" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PayrollRun" ADD COLUMN IF NOT EXISTS "totalGross" DECIMAL(14,2);
ALTER TABLE "PayrollRun" ADD COLUMN IF NOT EXISTS "totalNet" DECIMAL(14,2);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PayrollLine" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "presentDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leaveDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "absentDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "halfDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "payableDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "workingDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlySalary" DECIMAL(14,2) NOT NULL,
    "earnedSalary" DECIMAL(14,2) NOT NULL,
    "deductions" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "netPay" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "PayrollLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PayrollLine_payrollRunId_userId_key" ON "PayrollLine"("payrollRunId", "userId");
CREATE INDEX IF NOT EXISTS "PayrollLine_organizationId_payrollRunId_idx" ON "PayrollLine"("organizationId", "payrollRunId");

DO $$ BEGIN
  ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
