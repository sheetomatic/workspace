-- AlterTable
ALTER TABLE "ImsItem" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing rows so manual ordering starts from current code order
WITH ordered AS (
    SELECT "id", ROW_NUMBER() OVER (
        PARTITION BY "organizationId"
        ORDER BY "itemType" ASC, "code" ASC
    ) AS rn
    FROM "ImsItem"
)
UPDATE "ImsItem" AS i
SET "sortOrder" = ordered.rn
FROM ordered
WHERE i."id" = ordered."id";
