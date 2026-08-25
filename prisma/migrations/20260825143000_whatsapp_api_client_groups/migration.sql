-- AlterEnum
CREATE TYPE "WhatsAppApiAccountGroup" AS ENUM ('REGULAR', 'INACTIVE');

-- DropIndex
DROP INDEX "WhatsAppApiClient_phone_key";

-- AlterTable
ALTER TABLE "WhatsAppApiClient" ADD COLUMN "externalId" TEXT;
ALTER TABLE "WhatsAppApiClient" ADD COLUMN "accountGroup" "WhatsAppApiAccountGroup" NOT NULL DEFAULT 'REGULAR';

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppApiClient_externalId_key" ON "WhatsAppApiClient"("externalId");
CREATE INDEX "WhatsAppApiClient_phone_idx" ON "WhatsAppApiClient"("phone");
CREATE INDEX "WhatsAppApiClient_accountGroup_status_expiresAt_idx" ON "WhatsAppApiClient"("accountGroup", "status", "expiresAt");
