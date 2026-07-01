-- Primary platform workspace (Sheetomatic internal) gets full module entitlements.
UPDATE "Organization"
SET
  "plan" = 'ENTERPRISE',
  "allowedModules" = ARRAY['CASES', 'TASKS', 'FMS', 'HR', 'IMS', 'APPROVALS', 'REPORTS']::"WorkspaceModule"[],
  "maxMembers" = 999,
  "maxFmsTemplates" = 999
WHERE "isPrimary" = true
   OR slug = 'sheetomatic-technologies';

-- Owners on the primary workspace inherit full module access.
UPDATE "Membership" m
SET "modules" = ARRAY['CASES', 'TASKS', 'FMS', 'HR', 'IMS', 'APPROVALS', 'REPORTS']::"WorkspaceModule"[]
FROM "Organization" o
WHERE m."organizationId" = o.id
  AND (o."isPrimary" = true OR o.slug = 'sheetomatic-technologies')
  AND m.role = 'OWNER';
