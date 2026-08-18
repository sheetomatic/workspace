-- AlterTable
ALTER TABLE "CourseEnrollment" ADD COLUMN "groupMeetUrl" TEXT;
ALTER TABLE "CourseEnrollment" ADD COLUMN "groupLabel" TEXT;
ALTER TABLE "CourseEnrollment" ADD COLUMN "groupKey" TEXT;

-- CreateIndex
CREATE INDEX "CourseEnrollment_groupKey_idx" ON "CourseEnrollment"("groupKey");
