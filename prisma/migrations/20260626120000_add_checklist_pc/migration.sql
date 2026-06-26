-- CreateEnum
CREATE TYPE "ChecklistTeam" AS ENUM ('ACCOUNTS', 'HR', 'MAINTENANCE', 'QUALITY', 'STORE', 'GENERAL');

-- CreateEnum
CREATE TYPE "ChecklistFrequency" AS ENUM ('WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "ChecklistOccurrenceStatus" AS ENUM ('PENDING', 'DONE', 'OVERDUE');

-- CreateEnum
CREATE TYPE "ChecklistReferenceKind" AS ENUM ('WEB', 'YOUTUBE', 'SHARED');

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN "lastTaskDigestAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ChecklistTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "team" "ChecklistTeam" NOT NULL DEFAULT 'GENERAL',
    "frequency" "ChecklistFrequency" NOT NULL,
    "dueMonthDay" INTEGER,
    "dueWeekday" INTEGER,
    "dueMonth" INTEGER,
    "anchorDate" TIMESTAMP(3),
    "dueHour" INTEGER NOT NULL DEFAULT 18,
    "dueMinute" INTEGER NOT NULL DEFAULT 0,
    "assigneeUserId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "remindViaEmail" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistReference" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "kind" "ChecklistReferenceKind" NOT NULL,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChecklistReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistOccurrence" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "assigneeUserId" TEXT NOT NULL,
    "seriesKey" TEXT NOT NULL,
    "plannedAt" TIMESTAMP(3) NOT NULL,
    "actualAt" TIMESTAMP(3),
    "delayMinutes" INTEGER,
    "status" "ChecklistOccurrenceStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "completedById" TEXT,
    "emailReminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChecklistTemplate_organizationId_isActive_idx" ON "ChecklistTemplate"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "ChecklistTemplate_organizationId_team_idx" ON "ChecklistTemplate"("organizationId", "team");

-- CreateIndex
CREATE INDEX "ChecklistTemplate_organizationId_assigneeUserId_idx" ON "ChecklistTemplate"("organizationId", "assigneeUserId");

-- CreateIndex
CREATE INDEX "ChecklistReference_templateId_idx" ON "ChecklistReference"("templateId");

-- CreateIndex
CREATE INDEX "ChecklistOccurrence_organizationId_assigneeUserId_status_idx" ON "ChecklistOccurrence"("organizationId", "assigneeUserId", "status");

-- CreateIndex
CREATE INDEX "ChecklistOccurrence_organizationId_plannedAt_idx" ON "ChecklistOccurrence"("organizationId", "plannedAt");

-- CreateIndex
CREATE INDEX "ChecklistOccurrence_organizationId_status_plannedAt_idx" ON "ChecklistOccurrence"("organizationId", "status", "plannedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistOccurrence_templateId_seriesKey_key" ON "ChecklistOccurrence"("templateId", "seriesKey");

-- AddForeignKey
ALTER TABLE "ChecklistTemplate" ADD CONSTRAINT "ChecklistTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTemplate" ADD CONSTRAINT "ChecklistTemplate_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTemplate" ADD CONSTRAINT "ChecklistTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistReference" ADD CONSTRAINT "ChecklistReference_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistOccurrence" ADD CONSTRAINT "ChecklistOccurrence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistOccurrence" ADD CONSTRAINT "ChecklistOccurrence_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistOccurrence" ADD CONSTRAINT "ChecklistOccurrence_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistOccurrence" ADD CONSTRAINT "ChecklistOccurrence_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
