-- CreateEnum
CREATE TYPE "WaConversationStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "WaMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE "WaPipelineStage" AS ENUM ('NEW', 'QUALIFIED', 'DEMO_BOOKED', 'WON', 'LOST');

-- CreateTable
CREATE TABLE "WaContact" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "intent" TEXT,
    "source" TEXT NOT NULL DEFAULT 'whatsapp',
    "pipelineStage" "WaPipelineStage" NOT NULL DEFAULT 'NEW',
    "tags" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "assignedToId" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaContact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WaConversation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "status" "WaConversationStatus" NOT NULL DEFAULT 'OPEN',
    "aiHandled" BOOLEAN NOT NULL DEFAULT false,
    "preview" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WaMessage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "externalId" TEXT,
    "direction" "WaMessageDirection" NOT NULL,
    "body" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'text',
    "sentByUserId" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiConfidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WaContact_organizationId_phone_key" ON "WaContact"("organizationId", "phone");
CREATE INDEX "WaContact_organizationId_lastMessageAt_idx" ON "WaContact"("organizationId", "lastMessageAt");
CREATE INDEX "WaContact_organizationId_pipelineStage_idx" ON "WaContact"("organizationId", "pipelineStage");
CREATE INDEX "WaConversation_organizationId_lastMessageAt_idx" ON "WaConversation"("organizationId", "lastMessageAt");
CREATE INDEX "WaConversation_contactId_idx" ON "WaConversation"("contactId");
CREATE UNIQUE INDEX "WaMessage_externalId_key" ON "WaMessage"("externalId");
CREATE INDEX "WaMessage_conversationId_createdAt_idx" ON "WaMessage"("conversationId", "createdAt");
CREATE INDEX "WaMessage_organizationId_createdAt_idx" ON "WaMessage"("organizationId", "createdAt");

ALTER TABLE "WaContact" ADD CONSTRAINT "WaContact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaContact" ADD CONSTRAINT "WaContact_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WaConversation" ADD CONSTRAINT "WaConversation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaConversation" ADD CONSTRAINT "WaConversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "WaContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaMessage" ADD CONSTRAINT "WaMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaMessage" ADD CONSTRAINT "WaMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WaConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaMessage" ADD CONSTRAINT "WaMessage_sentByUserId_fkey" FOREIGN KEY ("sentByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
