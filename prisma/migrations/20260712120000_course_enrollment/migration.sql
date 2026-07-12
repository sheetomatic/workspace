-- CreateEnum
CREATE TYPE "CourseCohort" AS ENUM ('MON_FRI', 'TUE_SAT');

-- CreateEnum
CREATE TYPE "CourseEnrollmentStatus" AS ENUM ('PAYMENT_PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "CourseEnrollment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "amountInr" INTEGER NOT NULL DEFAULT 35000,
    "cohort" "CourseCohort" NOT NULL,
    "status" "CourseEnrollmentStatus" NOT NULL DEFAULT 'PAYMENT_PENDING',
    "slotNotes" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "confirmedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseEnrollment_status_createdAt_idx" ON "CourseEnrollment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CourseEnrollment_email_idx" ON "CourseEnrollment"("email");

-- CreateIndex
CREATE INDEX "CourseEnrollment_phone_idx" ON "CourseEnrollment"("phone");
