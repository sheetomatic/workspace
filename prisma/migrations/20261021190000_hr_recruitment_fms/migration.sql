ALTER TABLE "JobOpening"
  ADD COLUMN "departmentName" TEXT,
  ADD COLUMN "vacancyCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "requiredJoiningDate" TIMESTAMP(3),
  ADD COLUMN "hiringReason" TEXT,
  ADD COLUMN "requestedBy" TEXT,
  ADD COLUMN "fmsInstanceId" TEXT;

CREATE UNIQUE INDEX "JobOpening_fmsInstanceId_key" ON "JobOpening"("fmsInstanceId");

ALTER TABLE "JobOpening"
  ADD CONSTRAINT "JobOpening_fmsInstanceId_fkey"
  FOREIGN KEY ("fmsInstanceId") REFERENCES "FmsInstance"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
