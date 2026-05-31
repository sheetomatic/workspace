-- CreateTable
CREATE TABLE "WhatsAppInboundEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "externalId" TEXT NOT NULL,
    "fromPhone" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "error" TEXT,
    "taskId" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppInboundEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppInboundEvent_externalId_key" ON "WhatsAppInboundEvent"("externalId");

-- CreateIndex
CREATE INDEX "WhatsAppInboundEvent_organizationId_createdAt_idx" ON "WhatsAppInboundEvent"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "WhatsAppInboundEvent" ADD CONSTRAINT "WhatsAppInboundEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
