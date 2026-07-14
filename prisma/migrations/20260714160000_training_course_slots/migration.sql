-- CreateEnum
CREATE TYPE "TrainingSlotStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "CourseEnrollment" ADD COLUMN     "programStartDate" TIMESTAMP(3),
ADD COLUMN     "meetUrl" TEXT,
ADD COLUMN     "bookingToken" TEXT,
ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "inboundLeadId" TEXT;

-- CreateTable
CREATE TABLE "TrainingCourseSlot" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "organizationId" TEXT,
    "inboundLeadId" TEXT,
    "sessionNumber" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "meetUrl" TEXT,
    "status" "TrainingSlotStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingCourseSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseEnrollment_bookingToken_key" ON "CourseEnrollment"("bookingToken");

-- CreateIndex
CREATE INDEX "CourseEnrollment_organizationId_inboundLeadId_idx" ON "CourseEnrollment"("organizationId", "inboundLeadId");

-- CreateIndex
CREATE INDEX "CourseEnrollment_bookingToken_idx" ON "CourseEnrollment"("bookingToken");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingCourseSlot_enrollmentId_sessionNumber_key" ON "TrainingCourseSlot"("enrollmentId", "sessionNumber");

-- CreateIndex
CREATE INDEX "TrainingCourseSlot_enrollmentId_startsAt_idx" ON "TrainingCourseSlot"("enrollmentId", "startsAt");

-- CreateIndex
CREATE INDEX "TrainingCourseSlot_organizationId_startsAt_idx" ON "TrainingCourseSlot"("organizationId", "startsAt");

-- CreateIndex
CREATE INDEX "TrainingCourseSlot_inboundLeadId_startsAt_idx" ON "TrainingCourseSlot"("inboundLeadId", "startsAt");

-- CreateIndex
CREATE INDEX "TrainingCourseSlot_status_startsAt_idx" ON "TrainingCourseSlot"("status", "startsAt");

-- AddForeignKey
ALTER TABLE "TrainingCourseSlot" ADD CONSTRAINT "TrainingCourseSlot_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "CourseEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
