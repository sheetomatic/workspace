-- Enable WhatsApp AI Go Live for Sheetomatic Technologies (primary workspace)

UPDATE "User" AS u
SET phone = COALESCE(u.phone, '919685788980')
FROM "Membership" AS m
JOIN "Organization" AS o ON o.id = m."organizationId"
WHERE m."userId" = u.id
  AND o.slug = 'sheetomatic-technologies'
  AND m.role IN ('OWNER', 'ADMIN');

INSERT INTO "WorkspaceWhatsAppSettings" (
  "organizationId",
  "businessPhone",
  "redlavaPhoneId",
  "botLiveAt",
  "updatedAt"
)
SELECT
  o.id,
  '919685788980',
  '1102997926228862',
  NOW(),
  NOW()
FROM "Organization" AS o
WHERE o.slug = 'sheetomatic-technologies'
ON CONFLICT ("organizationId") DO UPDATE SET
  "botLiveAt" = COALESCE("WorkspaceWhatsAppSettings"."botLiveAt", NOW()),
  "businessPhone" = COALESCE("WorkspaceWhatsAppSettings"."businessPhone", EXCLUDED."businessPhone"),
  "redlavaPhoneId" = COALESCE("WorkspaceWhatsAppSettings"."redlavaPhoneId", EXCLUDED."redlavaPhoneId"),
  "updatedAt" = NOW();
