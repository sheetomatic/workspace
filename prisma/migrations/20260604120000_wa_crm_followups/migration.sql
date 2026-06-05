-- WA CRM: follow-ups and next follow-up on contacts
ALTER TABLE "WaContact" ADD COLUMN "nextFollowUpAt" TIMESTAMP(3);

CREATE INDEX "WaContact_organizationId_assignedToId_idx" ON "WaContact"("organizationId", "assignedToId");
CREATE INDEX "WaContact_organizationId_nextFollowUpAt_idx" ON "WaContact"("organizationId", "nextFollowUpAt");

CREATE TABLE "WaContactFollowUp" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "assigneeUserId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "reminderNote" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaContactFollowUp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WaContactFollowUp_organizationId_scheduledAt_idx" ON "WaContactFollowUp"("organizationId", "scheduledAt");
CREATE INDEX "WaContactFollowUp_contactId_idx" ON "WaContactFollowUp"("contactId");
CREATE INDEX "WaContactFollowUp_assigneeUserId_scheduledAt_idx" ON "WaContactFollowUp"("assigneeUserId", "scheduledAt");

ALTER TABLE "WaContactFollowUp" ADD CONSTRAINT "WaContactFollowUp_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaContactFollowUp" ADD CONSTRAINT "WaContactFollowUp_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "WaContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaContactFollowUp" ADD CONSTRAINT "WaContactFollowUp_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WaContactFollowUp" ADD CONSTRAINT "WaContactFollowUp_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
