-- Widen default booking window start to 08:30 IST.
ALTER TABLE "CourseEnrollment" ALTER COLUMN "sessionTimeIst" SET DEFAULT '08:30';
