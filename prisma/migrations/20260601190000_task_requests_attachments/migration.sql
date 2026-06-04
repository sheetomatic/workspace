-- Extend task workflow for assignee requests and completion proof.

ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'REVISION_REQUESTED';
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'EXTENSION_REQUESTED';
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'HELP_REQUESTED';

CREATE TYPE "TaskRequestType" AS ENUM ('REVISION', 'EXTENSION', 'HELP');
CREATE TYPE "TaskRequestStatus" AS ENUM ('OPEN', 'APPROVED', 'REJECTED', 'RESOLVED');

CREATE TABLE "TaskAttachment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "type" "TaskRequestType" NOT NULL,
    "status" "TaskRequestStatus" NOT NULL DEFAULT 'OPEN',
    "message" TEXT,
    "proposedDueAt" TIMESTAMP(3),
    "requestedById" TEXT NOT NULL,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TaskAttachment_taskId_idx" ON "TaskAttachment"("taskId");

CREATE INDEX "TaskRequest_organizationId_status_idx" ON "TaskRequest"("organizationId", "status");
CREATE INDEX "TaskRequest_taskId_status_idx" ON "TaskRequest"("taskId", "status");

ALTER TABLE "TaskAttachment" ADD CONSTRAINT "TaskAttachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "DelegatedTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskAttachment" ADD CONSTRAINT "TaskAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskRequest" ADD CONSTRAINT "TaskRequest_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "DelegatedTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskRequest" ADD CONSTRAINT "TaskRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskRequest" ADD CONSTRAINT "TaskRequest_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
