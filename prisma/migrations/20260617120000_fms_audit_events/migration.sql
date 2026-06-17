-- CreateEnum
CREATE TYPE "FmsAuditAction" AS ENUM ('FORM_SUBMITTED', 'STEP_COMPLETED', 'STEP_SKIPPED', 'STEP_REASSIGNED', 'INSTANCE_CANCELLED', 'DESIGN_APPROVED', 'DESIGN_REJECTED', 'DESIGN_SUBMITTED');

-- CreateTable
CREATE TABLE "FmsAuditEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "instanceId" TEXT,
    "userId" TEXT NOT NULL,
    "action" "FmsAuditAction" NOT NULL,
    "summary" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FmsAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FmsAuditEvent_organizationId_createdAt_idx" ON "FmsAuditEvent"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "FmsAuditEvent_instanceId_createdAt_idx" ON "FmsAuditEvent"("instanceId", "createdAt");

-- AddForeignKey
ALTER TABLE "FmsAuditEvent" ADD CONSTRAINT "FmsAuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FmsAuditEvent" ADD CONSTRAINT "FmsAuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
