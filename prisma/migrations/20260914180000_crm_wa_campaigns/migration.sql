-- CreateEnum
CREATE TYPE "WaCampaignStatus" AS ENUM ('DRAFT', 'QUEUED', 'RUNNING', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "WaCampaignRecipientStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "WaCampaign" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "WaCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "templateName" TEXT,
    "templateLanguage" TEXT NOT NULL DEFAULT 'en',
    "templateCategory" TEXT,
    "variableMap" JSONB NOT NULL DEFAULT '{}',
    "pauseReason" TEXT,
    "createdByUserId" TEXT,
    "startedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaCampaignRecipient" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "leadId" TEXT,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "status" "WaCampaignRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "errorCode" TEXT,
    "userMessageId" TEXT,
    "waMessageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaCampaignRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WaCampaign_organizationId_status_idx" ON "WaCampaign"("organizationId", "status");

-- CreateIndex
CREATE INDEX "WaCampaign_organizationId_createdAt_idx" ON "WaCampaign"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WaCampaignRecipient_campaignId_phone_key" ON "WaCampaignRecipient"("campaignId", "phone");

-- CreateIndex
CREATE INDEX "WaCampaignRecipient_campaignId_status_idx" ON "WaCampaignRecipient"("campaignId", "status");

-- CreateIndex
CREATE INDEX "WaCampaignRecipient_organizationId_status_idx" ON "WaCampaignRecipient"("organizationId", "status");

-- CreateIndex
CREATE INDEX "WaCampaignRecipient_leadId_idx" ON "WaCampaignRecipient"("leadId");

-- AddForeignKey
ALTER TABLE "WaCampaign" ADD CONSTRAINT "WaCampaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaCampaign" ADD CONSTRAINT "WaCampaign_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaCampaignRecipient" ADD CONSTRAINT "WaCampaignRecipient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaCampaignRecipient" ADD CONSTRAINT "WaCampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "WaCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaCampaignRecipient" ADD CONSTRAINT "WaCampaignRecipient_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "InboundLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
