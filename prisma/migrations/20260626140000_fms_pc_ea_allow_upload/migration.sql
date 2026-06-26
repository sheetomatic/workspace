-- AlterTable: FMS template PC/EA assignment
ALTER TABLE "FmsTemplate" ADD COLUMN "pcUserIds" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "FmsTemplate" ADD COLUMN "eaUserId" TEXT;

-- AlterTable: default allowUpload to true for new steps
ALTER TABLE "FmsTemplateStep" ALTER COLUMN "allowUpload" SET DEFAULT true;

-- Backfill: enable uploads on existing steps
UPDATE "FmsTemplateStep" SET "allowUpload" = true WHERE "allowUpload" = false;

-- AddForeignKey
ALTER TABLE "FmsTemplate" ADD CONSTRAINT "FmsTemplate_eaUserId_fkey" FOREIGN KEY ("eaUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "FmsTemplate_eaUserId_idx" ON "FmsTemplate"("eaUserId");
