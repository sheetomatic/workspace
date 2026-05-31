-- CreateEnum
CREATE TYPE "AttendanceWorkMode" AS ENUM ('OFFICE', 'FIELD', 'HYBRID');

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN "attendanceWorkMode" "AttendanceWorkMode" NOT NULL DEFAULT 'OFFICE';
ALTER TABLE "Membership" ADD COLUMN "geoFenceRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Membership" ADD COLUMN "faceRequired" BOOLEAN NOT NULL DEFAULT false;
