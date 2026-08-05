-- Training tab in the lead drawer is opt-in per lead.
ALTER TABLE "InboundLead" ADD COLUMN "trainingRequired" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: leads that already have training data keep their tab.
UPDATE "InboundLead" SET "trainingRequired" = true WHERE "category" = 'TRAINING_GWS';

UPDATE "InboundLead" SET "trainingRequired" = true
WHERE "id" IN (
  SELECT DISTINCT "inboundLeadId" FROM "TrainingCourseSlot" WHERE "inboundLeadId" IS NOT NULL
);

UPDATE "InboundLead" SET "trainingRequired" = true
WHERE "id" IN (
  SELECT DISTINCT "inboundLeadId" FROM "CourseEnrollment" WHERE "inboundLeadId" IS NOT NULL
);
