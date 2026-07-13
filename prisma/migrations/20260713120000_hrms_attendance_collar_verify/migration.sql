-- CreateEnum
CREATE TYPE "EmployeeCollarCategory" AS ENUM ('WHITE', 'BLUE');

-- CreateEnum
CREATE TYPE "AttendanceVerifyStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- AlterEnum
ALTER TYPE "AttendanceDayStatus" ADD VALUE IF NOT EXISTS 'SHORT_LEAVE';

-- AlterTable WorkspaceHrSettings
ALTER TABLE "WorkspaceHrSettings" ADD COLUMN IF NOT EXISTS "lateGraceMinutes" INTEGER NOT NULL DEFAULT 15;
ALTER TABLE "WorkspaceHrSettings" ADD COLUMN IF NOT EXISTS "halfDayEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "WorkspaceHrSettings" ADD COLUMN IF NOT EXISTS "shortLeaveEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "WorkspaceHrSettings" ADD COLUMN IF NOT EXISTS "shortLeaveHours" DOUBLE PRECISION NOT NULL DEFAULT 2;

-- AlterTable AttendanceRecord
ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "verifyStatus" "AttendanceVerifyStatus" NOT NULL DEFAULT 'VERIFIED';
ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "verifiedById" TEXT;
ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);
ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "isLate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "otHours" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable PayrollLine
ALTER TABLE "PayrollLine" ADD COLUMN IF NOT EXISTS "shortLeaveDays" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "PayrollLine" ADD COLUMN IF NOT EXISTS "otHours" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "PayrollLine" ADD COLUMN IF NOT EXISTS "otPay" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- AlterTable EmployeeProfile
ALTER TABLE "EmployeeProfile" ADD COLUMN IF NOT EXISTS "collarCategory" "EmployeeCollarCategory" NOT NULL DEFAULT 'WHITE';
ALTER TABLE "EmployeeProfile" ADD COLUMN IF NOT EXISTS "hourlyRate" DECIMAL(14,2);

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AttendanceRecord_organizationId_verifyStatus_idx" ON "AttendanceRecord"("organizationId", "verifyStatus");
