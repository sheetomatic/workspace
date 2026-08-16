-- CreateEnum
CREATE TYPE "TrainingMaterialKind" AS ENUM ('RECORDING', 'DOCUMENT');

-- CreateTable
CREATE TABLE "TrainingSessionMaterial" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "kind" "TrainingMaterialKind" NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "data" BYTEA,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingSessionMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingSessionMaterial_slotId_kind_idx" ON "TrainingSessionMaterial"("slotId", "kind");

-- AddForeignKey
ALTER TABLE "TrainingSessionMaterial" ADD CONSTRAINT "TrainingSessionMaterial_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "TrainingCourseSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
