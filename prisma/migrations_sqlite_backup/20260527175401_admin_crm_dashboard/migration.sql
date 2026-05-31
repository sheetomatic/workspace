-- CreateTable
CREATE TABLE "WorkspaceMetricCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "tone" TEXT NOT NULL DEFAULT 'DEFAULT',
    "actionLabel" TEXT NOT NULL DEFAULT 'Update',
    "actionHref" TEXT,
    "minRole" TEXT NOT NULL DEFAULT 'VIEWER',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkspaceMetricCard_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkspaceFollowUp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "followUpAt" DATETIME NOT NULL,
    "remarks" TEXT,
    "minRole" TEXT NOT NULL DEFAULT 'STAFF',
    "assigneeUserId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkspaceFollowUp_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkspaceFollowUp_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkspacePendingPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "dueAt" DATETIME NOT NULL,
    "minRole" TEXT NOT NULL DEFAULT 'STAFF',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkspacePendingPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WorkspaceMetricCard_organizationId_idx" ON "WorkspaceMetricCard"("organizationId");

-- CreateIndex
CREATE INDEX "WorkspaceFollowUp_organizationId_idx" ON "WorkspaceFollowUp"("organizationId");

-- CreateIndex
CREATE INDEX "WorkspaceFollowUp_assigneeUserId_idx" ON "WorkspaceFollowUp"("assigneeUserId");

-- CreateIndex
CREATE INDEX "WorkspacePendingPayment_organizationId_idx" ON "WorkspacePendingPayment"("organizationId");
