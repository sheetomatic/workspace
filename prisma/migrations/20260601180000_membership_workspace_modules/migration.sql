-- CreateEnum
CREATE TYPE "WorkspaceModule" AS ENUM ('TASKS', 'HR', 'APPROVALS', 'REPORTS');

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN "modules" "WorkspaceModule"[] NOT NULL DEFAULT ARRAY[]::"WorkspaceModule"[];

-- Backfill: owners/admins/managers get all modules; staff/viewers tasks only
UPDATE "Membership"
SET "modules" = ARRAY['TASKS', 'HR', 'APPROVALS', 'REPORTS']::"WorkspaceModule"[]
WHERE "role" IN ('OWNER', 'ADMIN', 'MANAGER');

UPDATE "Membership"
SET "modules" = ARRAY['TASKS']::"WorkspaceModule"[]
WHERE "role" IN ('STAFF', 'VIEWER');
