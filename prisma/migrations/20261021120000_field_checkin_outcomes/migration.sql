ALTER TABLE "FieldCheckIn"
  ADD COLUMN "callingRemarks" TEXT,
  ADD COLUMN "nextVisitDate" TIMESTAMP(3),
  ADD COLUMN "orderDetails" TEXT,
  ADD COLUMN "distributionDetails" TEXT;
