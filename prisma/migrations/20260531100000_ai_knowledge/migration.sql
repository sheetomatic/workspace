-- CreateEnum
CREATE TYPE "AiKnowledgeType" AS ENUM ('FAQ', 'DOCUMENT', 'WEBSITE');

-- CreateEnum
CREATE TYPE "AiKnowledgeStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "AiKnowledgeItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "AiKnowledgeType" NOT NULL,
    "title" TEXT NOT NULL,
    "question" TEXT,
    "content" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "status" "AiKnowledgeStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSyncedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiKnowledgeItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiKnowledgeItem_organizationId_type_status_idx" ON "AiKnowledgeItem"("organizationId", "type", "status");

-- CreateIndex
CREATE INDEX "AiKnowledgeItem_organizationId_status_idx" ON "AiKnowledgeItem"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "AiKnowledgeItem" ADD CONSTRAINT "AiKnowledgeItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiKnowledgeItem" ADD CONSTRAINT "AiKnowledgeItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
