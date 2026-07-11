-- Grandfather: orgs that already had FMS (Leads was FMS-gated) get CRM.
UPDATE "Organization"
SET "allowedModules" = array_append("allowedModules", 'CRM'::"WorkspaceModule")
WHERE 'FMS'::"WorkspaceModule" = ANY("allowedModules")
  AND NOT ('CRM'::"WorkspaceModule" = ANY("allowedModules"));

-- Grandfather memberships that had FMS access to Leads.
UPDATE "Membership"
SET "modules" = array_append("modules", 'CRM'::"WorkspaceModule")
WHERE 'FMS'::"WorkspaceModule" = ANY("modules")
  AND NOT ('CRM'::"WorkspaceModule" = ANY("modules"));
