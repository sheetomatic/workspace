-- CreateEnum
CREATE TYPE "FmsDesignStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "FmsTemplateStep" ADD COLUMN "instructions" TEXT;

-- CreateTable
CREATE TABLE "FmsFlowDesign" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "FmsDesignStatus" NOT NULL DEFAULT 'DRAFT',
    "steps" JSONB NOT NULL DEFAULT '[]',
    "alertConfig" JSONB NOT NULL DEFAULT '{}',
    "holidayDates" JSONB NOT NULL DEFAULT '[]',
    "formId" TEXT,
    "createdById" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FmsFlowDesign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FmsFlowDesign_formId_key" ON "FmsFlowDesign"("formId");

-- CreateIndex
CREATE INDEX "FmsFlowDesign_organizationId_status_idx" ON "FmsFlowDesign"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "FmsFlowDesign" ADD CONSTRAINT "FmsFlowDesign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FmsFlowDesign" ADD CONSTRAINT "FmsFlowDesign_formId_fkey" FOREIGN KEY ("formId") REFERENCES "FmsForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FmsFlowDesign" ADD CONSTRAINT "FmsFlowDesign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FmsFlowDesign" ADD CONSTRAINT "FmsFlowDesign_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
