-- AlterTable
ALTER TABLE "Membership" ADD COLUMN "isDepartmentHead" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Membership" ADD COLUMN "reportingManagerId" TEXT;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_reportingManagerId_fkey" FOREIGN KEY ("reportingManagerId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Membership_organizationId_isDepartmentHead_idx" ON "Membership"("organizationId", "isDepartmentHead");
CREATE INDEX "Membership_reportingManagerId_idx" ON "Membership"("reportingManagerId");
