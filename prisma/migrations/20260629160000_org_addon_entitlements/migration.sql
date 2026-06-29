-- Enforce modular add-on entitlements for primary BCI demo workspace.
UPDATE "Organization"
SET
  "plan" = 'BCI_STARTER',
  "allowedModules" = ARRAY['FMS', 'REPORTS', 'APPROVALS']::"WorkspaceModule"[]
WHERE slug = 'sheetomatic-technologies'
  AND cardinality("allowedModules") = 0;

-- Clamp founder membership to org add-ons (no Tasks until purchased).
UPDATE "Membership" m
SET "modules" = ARRAY['FMS', 'REPORTS', 'APPROVALS']::"WorkspaceModule"[]
FROM "Organization" o
WHERE m."organizationId" = o.id
  AND o.slug = 'sheetomatic-technologies'
  AND m.role = 'OWNER'
  AND cardinality(m.modules) = 0;
