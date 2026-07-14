-- AlterEnum
CREATE TYPE "TrainingFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY');

-- AlterTable
ALTER TABLE "CourseEnrollment"
  ADD COLUMN "frequency" "TrainingFrequency" NOT NULL DEFAULT 'WEEKLY',
  ADD COLUMN "sessionTimeIst" TEXT NOT NULL DEFAULT '08:30',
  ADD COLUMN "sessionDurationMin" INTEGER NOT NULL DEFAULT 90,
  ADD COLUMN "totalSessions" INTEGER NOT NULL DEFAULT 24;
