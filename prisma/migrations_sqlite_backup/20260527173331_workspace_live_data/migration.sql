-- CreateTable
CREATE TABLE "WorkspaceKpi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'trending',
    "minRole" TEXT NOT NULL DEFAULT 'VIEWER',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkspaceKpi_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkspaceAttentionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "minRole" TEXT NOT NULL DEFAULT 'STAFF',
    "assigneeUserId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkspaceAttentionItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkspaceAttentionItem_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkspaceApproval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "pendingSince" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "minRole" TEXT NOT NULL DEFAULT 'MANAGER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkspaceApproval_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WorkspaceKpi_organizationId_idx" ON "WorkspaceKpi"("organizationId");

-- CreateIndex
CREATE INDEX "WorkspaceAttentionItem_organizationId_idx" ON "WorkspaceAttentionItem"("organizationId");

-- CreateIndex
CREATE INDEX "WorkspaceAttentionItem_assigneeUserId_idx" ON "WorkspaceAttentionItem"("assigneeUserId");

-- CreateIndex
CREATE INDEX "WorkspaceApproval_organizationId_status_idx" ON "WorkspaceApproval"("organizationId", "status");
