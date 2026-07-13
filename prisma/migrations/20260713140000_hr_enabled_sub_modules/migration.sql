-- AlterTable
ALTER TABLE "WorkspaceHrSettings" ADD COLUMN IF NOT EXISTS "enabledHrSubModules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
