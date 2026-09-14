-- CreateEnum
CREATE TYPE "VideoJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'NOT_CONFIGURED');

-- CreateEnum
CREATE TYPE "VideoClipStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "VideoJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "requestedDurationSec" INTEGER,
    "effectiveDurationSec" INTEGER NOT NULL,
    "status" "VideoJobStatus" NOT NULL,
    "error" TEXT,
    "finalUrl" TEXT,
    "finalStorageKey" TEXT,
    "finalDurationSec" INTEGER,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoClip" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "providerClipId" TEXT,
    "providerUrl" TEXT,
    "status" "VideoClipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoClip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoJob_organizationId_createdAt_idx" ON "VideoJob"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "VideoJob_organizationId_status_idx" ON "VideoJob"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "VideoClip_jobId_order_key" ON "VideoClip"("jobId", "order");

-- CreateIndex
CREATE INDEX "VideoClip_jobId_order_idx" ON "VideoClip"("jobId", "order");

-- AddForeignKey
ALTER TABLE "VideoJob" ADD CONSTRAINT "VideoJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoJob" ADD CONSTRAINT "VideoJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoClip" ADD CONSTRAINT "VideoClip_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "VideoJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
