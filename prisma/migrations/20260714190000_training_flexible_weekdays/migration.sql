-- AlterEnum
ALTER TYPE "CourseCohort" ADD VALUE 'CUSTOM';

-- AlterTable
ALTER TABLE "CourseEnrollment" ADD COLUMN "weekdaysCsv" TEXT;

-- Default booking window starts at 09:00 IST (was 08:30).
ALTER TABLE "CourseEnrollment" ALTER COLUMN "sessionTimeIst" SET DEFAULT '09:00';
