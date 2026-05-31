-- AlterTable
ALTER TABLE "DelegatedTask" ADD COLUMN "category" TEXT;

-- CreateIndex
CREATE INDEX "DelegatedTask_organizationId_category_idx" ON "DelegatedTask"("organizationId", "category");
