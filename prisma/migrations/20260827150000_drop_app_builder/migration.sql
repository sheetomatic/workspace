-- App Builder is Desktop-only. Convert leftover orgs and drop Neon tables.
UPDATE "Organization" SET "product" = 'WORKSPACE' WHERE "product" = 'APP_BUILDER';
UPDATE "Organization" SET "allowedModules" = array_remove("allowedModules", 'APP_BUILDER');
UPDATE "Membership" SET "modules" = array_remove("modules", 'APP_BUILDER');
DROP TABLE IF EXISTS "AppBuilderApp";
DROP TABLE IF EXISTS "AppBuilderGoogleConnection";
