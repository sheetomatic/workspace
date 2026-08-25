-- CreateEnum
CREATE TYPE "MonthlyServiceClientStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateTable
CREATE TABLE "MonthlyServiceClient" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "inboundLeadId" TEXT,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "category" TEXT NOT NULL,
    "monthlyRatePaise" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "nextDueAt" TIMESTAMP(3) NOT NULL,
    "status" "MonthlyServiceClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignedToId" TEXT,
    "workNote" TEXT,
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "lastReminderAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyServiceClient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyServiceClient_inboundLeadId_key" ON "MonthlyServiceClient"("inboundLeadId");

-- CreateIndex
CREATE INDEX "MonthlyServiceClient_organizationId_status_nextDueAt_idx" ON "MonthlyServiceClient"("organizationId", "status", "nextDueAt");

-- CreateIndex
CREATE INDEX "MonthlyServiceClient_organizationId_category_idx" ON "MonthlyServiceClient"("organizationId", "category");

-- CreateIndex
CREATE INDEX "MonthlyServiceClient_organizationId_phone_idx" ON "MonthlyServiceClient"("organizationId", "phone");

-- AddForeignKey
ALTER TABLE "MonthlyServiceClient" ADD CONSTRAINT "MonthlyServiceClient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyServiceClient" ADD CONSTRAINT "MonthlyServiceClient_inboundLeadId_fkey" FOREIGN KEY ("inboundLeadId") REFERENCES "InboundLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyServiceClient" ADD CONSTRAINT "MonthlyServiceClient_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
