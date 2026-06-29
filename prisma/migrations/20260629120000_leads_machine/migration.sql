-- Leads Machine: unified inbound leads from WA / Meta / Google Sheets -> FMS Lead-Sales

CREATE TYPE "LeadSourceChannel" AS ENUM ('WHATSAPP', 'INSTAGRAM', 'FACEBOOK', 'GOOGLE_SHEETS', 'MANUAL', 'API');
CREATE TYPE "InboundLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'FOLLOW_UP', 'QUALIFIED', 'WON', 'LOST');
CREATE TYPE "LeadConnectionSyncStatus" AS ENUM ('IDLE', 'SYNCING', 'ERROR');

ALTER TABLE "Organization" ADD COLUMN "leadMachineApiKeyHint" TEXT;
ALTER TABLE "Organization" ADD COLUMN "leadMachineApiKeyHash" TEXT;

CREATE TABLE "LeadIngestConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "channel" "LeadSourceChannel" NOT NULL,
    "label" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL DEFAULT '{}',
    "ingestSecretHash" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "syncStatus" "LeadConnectionSyncStatus" NOT NULL DEFAULT 'IDLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadIngestConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InboundLead" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "connectionId" TEXT,
    "channel" "LeadSourceChannel" NOT NULL,
    "externalId" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "city" TEXT,
    "requirement" TEXT,
    "sourceDetail" TEXT,
    "status" "InboundLeadStatus" NOT NULL DEFAULT 'NEW',
    "rawPayload" JSONB,
    "fmsInstanceId" TEXT,
    "waContactId" TEXT,
    "assignedToId" TEXT,
    "nextFollowUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboundLead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InboundLeadFollowUp" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "assigneeUserId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboundLeadFollowUp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeadIngestConnection_organizationId_channel_key" ON "LeadIngestConnection"("organizationId", "channel");
CREATE INDEX "LeadIngestConnection_organizationId_enabled_idx" ON "LeadIngestConnection"("organizationId", "enabled");

CREATE UNIQUE INDEX "InboundLead_fmsInstanceId_key" ON "InboundLead"("fmsInstanceId");
CREATE UNIQUE INDEX "InboundLead_waContactId_key" ON "InboundLead"("waContactId");
CREATE UNIQUE INDEX "InboundLead_organizationId_channel_externalId_key" ON "InboundLead"("organizationId", "channel", "externalId");
CREATE INDEX "InboundLead_organizationId_status_idx" ON "InboundLead"("organizationId", "status");
CREATE INDEX "InboundLead_organizationId_channel_idx" ON "InboundLead"("organizationId", "channel");
CREATE INDEX "InboundLead_organizationId_nextFollowUpAt_idx" ON "InboundLead"("organizationId", "nextFollowUpAt");
CREATE INDEX "InboundLead_organizationId_assignedToId_idx" ON "InboundLead"("organizationId", "assignedToId");

CREATE INDEX "InboundLeadFollowUp_organizationId_scheduledAt_idx" ON "InboundLeadFollowUp"("organizationId", "scheduledAt");
CREATE INDEX "InboundLeadFollowUp_leadId_idx" ON "InboundLeadFollowUp"("leadId");

ALTER TABLE "LeadIngestConnection" ADD CONSTRAINT "LeadIngestConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InboundLead" ADD CONSTRAINT "InboundLead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InboundLead" ADD CONSTRAINT "InboundLead_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "LeadIngestConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InboundLead" ADD CONSTRAINT "InboundLead_fmsInstanceId_fkey" FOREIGN KEY ("fmsInstanceId") REFERENCES "FmsInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InboundLead" ADD CONSTRAINT "InboundLead_waContactId_fkey" FOREIGN KEY ("waContactId") REFERENCES "WaContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InboundLead" ADD CONSTRAINT "InboundLead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InboundLeadFollowUp" ADD CONSTRAINT "InboundLeadFollowUp_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InboundLeadFollowUp" ADD CONSTRAINT "InboundLeadFollowUp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "InboundLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InboundLeadFollowUp" ADD CONSTRAINT "InboundLeadFollowUp_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InboundLeadFollowUp" ADD CONSTRAINT "InboundLeadFollowUp_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
