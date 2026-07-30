-- Per-member CRM sub-module access

ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "enabledCrmSubModules" TEXT[] DEFAULT ARRAY[]::TEXT[];
