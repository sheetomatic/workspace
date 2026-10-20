-- AlterEnum
ALTER TYPE "LeadSourceChannel" ADD VALUE 'LINKEDIN';

-- AlterTable
ALTER TABLE "InboundLead" ADD COLUMN     "linkedInAppId" TEXT,
ADD COLUMN     "linkedInDetectedAt" TIMESTAMP(3),
ADD COLUMN     "linkedInHeadline" TEXT,
ADD COLUMN     "linkedInMemberUrn" TEXT,
ADD COLUMN     "linkedInProfileUrl" TEXT;

-- CreateTable
CREATE TABLE "LinkedInAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "accessTokenEncrypted" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "baselineCompletedAt" TIMESTAMP(3),
    "scanStart" INTEGER NOT NULL DEFAULT 0,
    "lastSyncAt" TIMESTAMP(3),
    "nextSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncError" TEXT,
    "lockToken" TEXT,
    "lockExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkedInAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkedInOAuthState" (
    "stateHash" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "returnUrl" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinkedInOAuthState_pkey" PRIMARY KEY ("stateHash")
);

-- CreateTable
CREATE TABLE "LinkedInAcceptance" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "invitationUrn" TEXT NOT NULL,
    "memberUrn" TEXT NOT NULL,
    "baseline" BOOLEAN NOT NULL DEFAULT false,
    "leadId" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinkedInAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LinkedInAccount_enabled_nextSyncAt_idx" ON "LinkedInAccount"("enabled", "nextSyncAt");

-- CreateIndex
CREATE INDEX "LinkedInAccount_organizationId_ownerUserId_idx" ON "LinkedInAccount"("organizationId", "ownerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "LinkedInAccount_organizationId_appId_subjectId_key" ON "LinkedInAccount"("organizationId", "appId", "subjectId");

-- CreateIndex
CREATE INDEX "LinkedInOAuthState_expiresAt_idx" ON "LinkedInOAuthState"("expiresAt");

-- CreateIndex
CREATE INDEX "LinkedInAcceptance_leadId_idx" ON "LinkedInAcceptance"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "LinkedInAcceptance_accountId_invitationUrn_key" ON "LinkedInAcceptance"("accountId", "invitationUrn");

-- CreateIndex
CREATE UNIQUE INDEX "InboundLead_linkedin_identity_key" ON "InboundLead"("organizationId", "linkedInAppId", "linkedInMemberUrn");

-- AddForeignKey
ALTER TABLE "LinkedInAccount" ADD CONSTRAINT "LinkedInAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkedInAccount" ADD CONSTRAINT "LinkedInAccount_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkedInAcceptance" ADD CONSTRAINT "LinkedInAcceptance_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LinkedInAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkedInAcceptance" ADD CONSTRAINT "LinkedInAcceptance_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "InboundLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
