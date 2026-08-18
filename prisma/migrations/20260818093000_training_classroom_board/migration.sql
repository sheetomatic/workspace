ALTER TABLE "TrainingCourseSlot" ADD COLUMN "classroomBoard" JSONB;
ALTER TABLE "TrainingCourseSlot" ADD COLUMN "classroomBoardRev" INTEGER NOT NULL DEFAULT 0;
