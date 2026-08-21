-- CreateEnum
CREATE TYPE "WorkspaceProduct" AS ENUM ('WORKSPACE', 'APP_BUILDER');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "product" "WorkspaceProduct" NOT NULL DEFAULT 'WORKSPACE';

-- CreateTable
CREATE TABLE "AppBuilderGoogleConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "googleEmail" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "accessToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "spreadsheetId" TEXT,
    "spreadsheetTitle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppBuilderGoogleConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppBuilderGoogleConnection_organizationId_key" ON "AppBuilderGoogleConnection"("organizationId");
CREATE INDEX "AppBuilderGoogleConnection_googleEmail_idx" ON "AppBuilderGoogleConnection"("googleEmail");

-- AddForeignKey
ALTER TABLE "AppBuilderGoogleConnection" ADD CONSTRAINT "AppBuilderGoogleConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill App Builder website signups (lead lives on the primary org).
UPDATE "Organization" o
SET "product" = 'APP_BUILDER'
WHERE o.id IN (
  SELECT m."organizationId"
  FROM "Membership" m
  INNER JOIN "User" u ON u.id = m."userId"
  WHERE EXISTS (
    SELECT 1
    FROM "InboundLead" l
    WHERE l."externalId" = 'app-builder-signup:' || lower(u.email)
       OR (
         lower(l.email) = lower(u.email)
         AND l."sourceDetail" = 'App Builder website signup'
       )
  )
);
