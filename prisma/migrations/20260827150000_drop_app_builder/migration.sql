-- App Builder left this product. Studio lives on the desktop repo only.
UPDATE "Organization" SET "product" = 'WORKSPACE' WHERE "product" = 'APP_BUILDER';

UPDATE "Organization"
SET "allowedModules" = array_remove("allowedModules", 'APP_BUILDER')
WHERE 'APP_BUILDER' = ANY("allowedModules");

UPDATE "Membership"
SET "modules" = array_remove("modules", 'APP_BUILDER')
WHERE 'APP_BUILDER' = ANY("modules");

DROP TABLE IF EXISTS "AppBuilderApp";
DROP TABLE IF EXISTS "AppBuilderGoogleConnection";
