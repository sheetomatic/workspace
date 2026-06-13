-- Per-organization WhatsApp AI reply limits and usage tracking
CREATE TABLE "WorkspaceAiReplySettings" (
    "organizationId" TEXT NOT NULL,
    "dailyLimit" INTEGER NOT NULL DEFAULT 300,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceAiReplySettings_pkey" PRIMARY KEY ("organizationId")
);

CREATE TABLE "AiReplyUsageEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "handoff" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiReplyUsageEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiReplyUsageEvent_organizationId_createdAt_idx" ON "AiReplyUsageEvent"("organizationId", "createdAt");

ALTER TABLE "WorkspaceAiReplySettings" ADD CONSTRAINT "WorkspaceAiReplySettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiReplyUsageEvent" ADD CONSTRAINT "AiReplyUsageEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
