-- In-panel classroom metadata. Video stays on YouTube / Drive.
ALTER TABLE "TrainingCourseSlot" ADD COLUMN "classroomRoomName" TEXT;
ALTER TABLE "TrainingCourseSlot" ADD COLUMN "classroomUrl" TEXT;
ALTER TABLE "TrainingCourseSlot" ADD COLUMN "classroomStartedAt" TIMESTAMP(3);
ALTER TABLE "TrainingCourseSlot" ADD COLUMN "classroomEndedAt" TIMESTAMP(3);
