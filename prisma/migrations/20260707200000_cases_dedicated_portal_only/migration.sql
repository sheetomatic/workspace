-- Legal Cases module is dedicated-portal only (Hingorani). Remove from default platform workspaces.
UPDATE "Organization"
SET
  "allowedModules" = array_remove("allowedModules", 'CASES'::"WorkspaceModule")
WHERE slug <> 'hingorani'
  AND 'CASES'::"WorkspaceModule" = ANY("allowedModules");

UPDATE "Organization"
SET
  "allowedModules" = ARRAY['TASKS', 'FMS', 'HR', 'IMS', 'APPROVALS', 'REPORTS']::"WorkspaceModule"[]
WHERE "isPrimary" = true
   OR slug = 'sheetomatic-technologies';

UPDATE "Membership" m
SET "modules" = array_remove(m."modules", 'CASES'::"WorkspaceModule")
FROM "Organization" o
WHERE m."organizationId" = o.id
  AND o.slug <> 'hingorani'
  AND 'CASES'::"WorkspaceModule" = ANY(m."modules");
