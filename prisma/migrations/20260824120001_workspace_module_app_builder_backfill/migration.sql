-- Primary workspace (Sheetomatic Technologies) gets App Builder.
UPDATE "Organization"
SET "allowedModules" = array_append("allowedModules", 'APP_BUILDER'::"WorkspaceModule")
WHERE "isPrimary" = true
  AND NOT ('APP_BUILDER'::"WorkspaceModule" = ANY("allowedModules"));

-- Owners and admins on that workspace can open it without a re-invite.
UPDATE "Membership" AS m
SET "modules" = array_append(m."modules", 'APP_BUILDER'::"WorkspaceModule")
FROM "Organization" AS o
WHERE m."organizationId" = o.id
  AND o."isPrimary" = true
  AND m."role" IN ('OWNER', 'ADMIN')
  AND NOT ('APP_BUILDER'::"WorkspaceModule" = ANY(m."modules"));
