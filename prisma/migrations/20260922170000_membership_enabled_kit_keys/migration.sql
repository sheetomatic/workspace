-- Per-member add-on kits (Mobile Shop). Empty = not granted on this person.

ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "enabledKitKeys" TEXT[] DEFAULT ARRAY[]::TEXT[];
