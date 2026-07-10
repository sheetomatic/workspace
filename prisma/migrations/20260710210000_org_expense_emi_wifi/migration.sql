-- AlterEnum
ALTER TYPE "OrgExpenseCategory" ADD VALUE 'INTERNET_WIFI';

-- AlterTable
ALTER TABLE "OrgExpenseEntry" ADD COLUMN "assetLabel" TEXT;
