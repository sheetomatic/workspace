-- Public courses split into Business Owners and Working Professionals.
-- Existing rows stay LEGACY (the earlier single program).

CREATE TYPE "CourseProgram" AS ENUM ('BUSINESS_OWNER', 'WORKING_PROFESSIONAL', 'LEGACY');

ALTER TABLE "CourseEnrollment" ADD COLUMN "program" "CourseProgram" NOT NULL DEFAULT 'LEGACY';
