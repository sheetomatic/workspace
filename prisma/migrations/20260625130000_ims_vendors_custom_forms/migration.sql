-- CreateEnum
CREATE TYPE "ImsFormEntity" AS ENUM ('ITEM', 'VENDOR');
CREATE TYPE "ImsCustomFieldType" AS ENUM ('TEXT', 'TEXTAREA', 'NUMBER', 'SELECT', 'DATE', 'CHECKBOX');

-- AlterTable
ALTER TABLE "ImsItem" ADD COLUMN "customValues" JSONB;

-- CreateTable
CREATE TABLE "ImsVendor" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "gstin" TEXT,
    "paymentTerms" TEXT,
    "leadTimeDays" INTEGER,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "customValues" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImsVendor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImsCustomField" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entity" "ImsFormEntity" NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" "ImsCustomFieldType" NOT NULL,
    "options" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "required" BOOLEAN NOT NULL DEFAULT false,
    "helpText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImsCustomField_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImsFieldSetting" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entity" "ImsFormEntity" NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "label" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ImsFieldSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImsVendor_organizationId_code_key" ON "ImsVendor"("organizationId", "code");
CREATE INDEX "ImsVendor_organizationId_isActive_idx" ON "ImsVendor"("organizationId", "isActive");
CREATE UNIQUE INDEX "ImsCustomField_organizationId_entity_key_key" ON "ImsCustomField"("organizationId", "entity", "key");
CREATE INDEX "ImsCustomField_organizationId_entity_isActive_idx" ON "ImsCustomField"("organizationId", "entity", "isActive");
CREATE UNIQUE INDEX "ImsFieldSetting_organizationId_entity_fieldKey_key" ON "ImsFieldSetting"("organizationId", "entity", "fieldKey");

-- AddForeignKey
ALTER TABLE "ImsVendor" ADD CONSTRAINT "ImsVendor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImsCustomField" ADD CONSTRAINT "ImsCustomField_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImsFieldSetting" ADD CONSTRAINT "ImsFieldSetting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
