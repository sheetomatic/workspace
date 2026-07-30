-- Per-member HR sub-module access (org ∩ member)

ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "enabledHrSubModules" TEXT[] DEFAULT ARRAY[]::TEXT[];
