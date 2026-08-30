-- AlterTable (shared DB may already have this from Anmol portal migrate)
ALTER TABLE "DelegatedTask" ADD COLUMN IF NOT EXISTS "startAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DelegatedTask_organizationId_startAt_idx" ON "DelegatedTask"("organizationId", "startAt");
