-- CreateEnum
CREATE TYPE "TaskAiRoute" AS ENUM ('PARSE', 'TRANSCRIBE');

-- CreateTable
CREATE TABLE "WorkspaceTaskAiSettings" (
    "organizationId" TEXT NOT NULL,
    "dailyLimit" INTEGER NOT NULL DEFAULT 200,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceTaskAiSettings_pkey" PRIMARY KEY ("organizationId")
);

-- CreateTable
CREATE TABLE "TaskAiUsageEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "route" "TaskAiRoute" NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "audioBytes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskAiUsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskAiUsageEvent_organizationId_createdAt_idx" ON "TaskAiUsageEvent"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "TaskAiUsageEvent_userId_createdAt_idx" ON "TaskAiUsageEvent"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "WorkspaceTaskAiSettings" ADD CONSTRAINT "WorkspaceTaskAiSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAiUsageEvent" ADD CONSTRAINT "TaskAiUsageEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAiUsageEvent" ADD CONSTRAINT "TaskAiUsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
