-- CreateEnum
CREATE TYPE "WaLeadCaptureStep" AS ENUM ('PENDING', 'NAME', 'EMAIL', 'CITY', 'REQUIREMENT', 'COMPLETE');

-- AlterTable
ALTER TABLE "WaContact"
ADD COLUMN "email" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "requirementDescription" TEXT,
ADD COLUMN "leadCaptureStep" "WaLeadCaptureStep" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "leadCaptureComplete" BOOLEAN NOT NULL DEFAULT false;

-- Existing contacts should not be forced through capture again.
UPDATE "WaContact"
SET "leadCaptureComplete" = true,
    "leadCaptureStep" = 'COMPLETE'
WHERE "leadCaptureComplete" = false;
