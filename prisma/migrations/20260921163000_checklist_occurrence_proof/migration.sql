-- Optional proof upload on a checklist run (notes stay on the occurrence).
ALTER TABLE "ChecklistOccurrence" ADD COLUMN "proofFileName" TEXT;
ALTER TABLE "ChecklistOccurrence" ADD COLUMN "proofMimeType" TEXT;
ALTER TABLE "ChecklistOccurrence" ADD COLUMN "proofFileSize" INTEGER;
ALTER TABLE "ChecklistOccurrence" ADD COLUMN "proofData" BYTEA;
