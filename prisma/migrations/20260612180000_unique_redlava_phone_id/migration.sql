-- Clear duplicate Phone IDs (keep one workspace per ID; others must re-save in Settings).
UPDATE "WorkspaceWhatsAppSettings" AS w
SET "redlavaPhoneId" = NULL
WHERE "redlavaPhoneId" IS NOT NULL
  AND "organizationId" NOT IN (
    SELECT DISTINCT ON ("redlavaPhoneId") "organizationId"
    FROM "WorkspaceWhatsAppSettings"
    WHERE "redlavaPhoneId" IS NOT NULL
    ORDER BY "redlavaPhoneId", "updatedAt" DESC
  );

CREATE UNIQUE INDEX "WorkspaceWhatsAppSettings_redlavaPhoneId_key"
ON "WorkspaceWhatsAppSettings"("redlavaPhoneId")
WHERE "redlavaPhoneId" IS NOT NULL;
