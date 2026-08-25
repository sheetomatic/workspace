-- CreateEnum
CREATE TYPE "WhatsAppApiPlanKind" AS ENUM ('OFFICIAL', 'UNOFFICIAL');

-- CreateEnum
CREATE TYPE "WhatsAppApiClientStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "WhatsAppApiClient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "planKind" "WhatsAppApiPlanKind" NOT NULL,
    "planId" TEXT NOT NULL,
    "planLabel" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "WhatsAppApiClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastReminderAt" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppApiClient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppApiClient_phone_key" ON "WhatsAppApiClient"("phone");

-- CreateIndex
CREATE INDEX "WhatsAppApiClient_expiresAt_status_idx" ON "WhatsAppApiClient"("expiresAt", "status");

-- CreateIndex
CREATE INDEX "WhatsAppApiClient_status_expiresAt_idx" ON "WhatsAppApiClient"("status", "expiresAt");
