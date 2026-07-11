-- Per-user workspace nav / home visibility preferences.
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "workspacePrefs" JSONB;
