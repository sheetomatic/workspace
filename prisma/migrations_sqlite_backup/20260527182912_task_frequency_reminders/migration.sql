-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DelegatedTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "department" TEXT NOT NULL DEFAULT 'GENERAL',
    "frequency" TEXT NOT NULL DEFAULT 'ONCE',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "seriesId" TEXT,
    "occurrenceNumber" INTEGER NOT NULL DEFAULT 1,
    "nextOccurrenceAt" DATETIME,
    "remindViaEmail" BOOLEAN NOT NULL DEFAULT false,
    "remindViaWhatsApp" BOOLEAN NOT NULL DEFAULT false,
    "emailReminderSentAt" DATETIME,
    "whatsappReminderSentAt" DATETIME,
    "dueAt" DATETIME NOT NULL,
    "assigneeUserId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DelegatedTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DelegatedTask_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DelegatedTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DelegatedTask" ("assigneeUserId", "completedAt", "createdAt", "createdById", "department", "dueAt", "id", "instructions", "organizationId", "priority", "status", "title", "updatedAt") SELECT "assigneeUserId", "completedAt", "createdAt", "createdById", "department", "dueAt", "id", "instructions", "organizationId", "priority", "status", "title", "updatedAt" FROM "DelegatedTask";
DROP TABLE "DelegatedTask";
ALTER TABLE "new_DelegatedTask" RENAME TO "DelegatedTask";
CREATE INDEX "DelegatedTask_organizationId_status_idx" ON "DelegatedTask"("organizationId", "status");
CREATE INDEX "DelegatedTask_organizationId_assigneeUserId_idx" ON "DelegatedTask"("organizationId", "assigneeUserId");
CREATE INDEX "DelegatedTask_organizationId_dueAt_idx" ON "DelegatedTask"("organizationId", "dueAt");
CREATE INDEX "DelegatedTask_organizationId_seriesId_idx" ON "DelegatedTask"("organizationId", "seriesId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
