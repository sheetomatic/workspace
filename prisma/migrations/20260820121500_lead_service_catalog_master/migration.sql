-- AlterTable
ALTER TABLE "LeadServiceCatalog" ADD COLUMN IF NOT EXISTS "perUserCost" DECIMAL(14,2);
ALTER TABLE "LeadServiceCatalog" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
