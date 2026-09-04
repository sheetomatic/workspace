-- AlterTable
ALTER TABLE "MobileShopMovement" ADD COLUMN "reason" TEXT NOT NULL DEFAULT 'PURCHASE';
CREATE INDEX "MobileShopMovement_organizationId_reason_idx" ON "MobileShopMovement"("organizationId", "reason");
