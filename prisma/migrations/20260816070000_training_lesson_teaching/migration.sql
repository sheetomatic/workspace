-- AlterTable
ALTER TABLE "TrainingLesson" ADD COLUMN "goal" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TrainingLesson" ADD COLUMN "practicePrompt" TEXT NOT NULL DEFAULT '';
