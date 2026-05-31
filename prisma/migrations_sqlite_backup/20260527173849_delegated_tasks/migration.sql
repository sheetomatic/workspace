-- CreateTable
CREATE TABLE "DelegatedTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "department" TEXT NOT NULL DEFAULT 'GENERAL',
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

-- CreateIndex
CREATE INDEX "DelegatedTask_organizationId_status_idx" ON "DelegatedTask"("organizationId", "status");

-- CreateIndex
CREATE INDEX "DelegatedTask_organizationId_assigneeUserId_idx" ON "DelegatedTask"("organizationId", "assigneeUserId");

-- CreateIndex
CREATE INDEX "DelegatedTask_organizationId_dueAt_idx" ON "DelegatedTask"("organizationId", "dueAt");
