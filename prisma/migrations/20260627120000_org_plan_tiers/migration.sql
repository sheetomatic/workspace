-- CreateEnum
CREATE TYPE "OrgPlan" AS ENUM ('BCI_STARTER', 'BCI_GROWTH', 'ENTERPRISE', 'LEGAL_ADDON');

-- AlterTable
ALTER TABLE "Organization"
ADD COLUMN "plan" "OrgPlan" NOT NULL DEFAULT 'BCI_STARTER',
ADD COLUMN "allowedModules" "WorkspaceModule"[] NOT NULL DEFAULT ARRAY[]::"WorkspaceModule"[],
ADD COLUMN "maxMembers" INTEGER NOT NULL DEFAULT 8,
ADD COLUMN "maxFmsTemplates" INTEGER NOT NULL DEFAULT 3;
