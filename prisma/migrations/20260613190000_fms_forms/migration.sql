-- AlterEnum
ALTER TYPE "WorkspaceModule" ADD VALUE IF NOT EXISTS 'FMS';

-- CreateEnum
CREATE TYPE "FmsFormFieldType" AS ENUM ('TEXT', 'TEXTAREA', 'NUMBER', 'ENUM', 'ENUM_LIST', 'DATE', 'DATETIME', 'EMAIL', 'PHONE', 'FILE');
CREATE TYPE "FmsFormStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "FmsTemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "FmsInstanceStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "FmsStepStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'SKIPPED');
CREATE TYPE "FmsSlaType" AS ENUM ('NONE', 'TAT_CALENDAR_DAYS', 'TAT_WORKING_HOURS', 'SPECIFIC_TIME', 'LEAD_TIME_MINUS');

-- CreateTable
CREATE TABLE "FmsForm" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "FmsFormStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FmsForm_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FmsFormField" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "fieldType" "FmsFormFieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB NOT NULL DEFAULT '[]',
    "placeholder" TEXT,
    "helpText" TEXT,

    CONSTRAINT "FmsFormField_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FmsTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "FmsTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FmsTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FmsTemplateStep" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "stepName" TEXT NOT NULL,
    "roleLabel" TEXT,
    "defaultOwnerUserId" TEXT,
    "slaType" "FmsSlaType" NOT NULL DEFAULT 'NONE',
    "slaConfig" JSONB NOT NULL DEFAULT '{}',
    "allowMarkDone" BOOLEAN NOT NULL DEFAULT true,
    "allowUpload" BOOLEAN NOT NULL DEFAULT false,
    "allowNotes" BOOLEAN NOT NULL DEFAULT true,
    "captureFields" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "FmsTemplateStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FmsFormSubmission" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "values" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FmsFormSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FmsInstance" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "submissionId" TEXT,
    "referenceLabel" TEXT,
    "status" "FmsInstanceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FmsInstance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FmsStepState" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "plannedAt" TIMESTAMP(3),
    "actualAt" TIMESTAMP(3),
    "status" "FmsStepStatus" NOT NULL DEFAULT 'PENDING',
    "delayMinutes" INTEGER,
    "completedByUserId" TEXT,
    "notes" TEXT,
    "completionValues" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "FmsStepState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FmsStepAttachment" (
    "id" TEXT NOT NULL,
    "stepStateId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FmsStepAttachment_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "FmsForm_organizationId_status_idx" ON "FmsForm"("organizationId", "status");
CREATE UNIQUE INDEX "FmsFormField_formId_fieldKey_key" ON "FmsFormField"("formId", "fieldKey");
CREATE INDEX "FmsFormField_formId_sortOrder_idx" ON "FmsFormField"("formId", "sortOrder");
CREATE UNIQUE INDEX "FmsTemplate_formId_key" ON "FmsTemplate"("formId");
CREATE INDEX "FmsTemplate_organizationId_status_idx" ON "FmsTemplate"("organizationId", "status");
CREATE INDEX "FmsTemplateStep_templateId_sortOrder_idx" ON "FmsTemplateStep"("templateId", "sortOrder");
CREATE INDEX "FmsFormSubmission_organizationId_formId_idx" ON "FmsFormSubmission"("organizationId", "formId");
CREATE INDEX "FmsFormSubmission_formId_createdAt_idx" ON "FmsFormSubmission"("formId", "createdAt");
CREATE UNIQUE INDEX "FmsInstance_submissionId_key" ON "FmsInstance"("submissionId");
CREATE INDEX "FmsInstance_organizationId_status_idx" ON "FmsInstance"("organizationId", "status");
CREATE INDEX "FmsInstance_templateId_createdAt_idx" ON "FmsInstance"("templateId", "createdAt");
CREATE UNIQUE INDEX "FmsStepState_instanceId_stepId_key" ON "FmsStepState"("instanceId", "stepId");
CREATE INDEX "FmsStepState_instanceId_status_idx" ON "FmsStepState"("instanceId", "status");
CREATE INDEX "FmsStepState_ownerUserId_status_idx" ON "FmsStepState"("ownerUserId", "status");
CREATE INDEX "FmsStepAttachment_stepStateId_idx" ON "FmsStepAttachment"("stepStateId");

-- ForeignKeys
ALTER TABLE "FmsForm" ADD CONSTRAINT "FmsForm_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FmsForm" ADD CONSTRAINT "FmsForm_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FmsFormField" ADD CONSTRAINT "FmsFormField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "FmsForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FmsTemplate" ADD CONSTRAINT "FmsTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FmsTemplate" ADD CONSTRAINT "FmsTemplate_formId_fkey" FOREIGN KEY ("formId") REFERENCES "FmsForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FmsTemplate" ADD CONSTRAINT "FmsTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FmsTemplateStep" ADD CONSTRAINT "FmsTemplateStep_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FmsTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FmsTemplateStep" ADD CONSTRAINT "FmsTemplateStep_defaultOwnerUserId_fkey" FOREIGN KEY ("defaultOwnerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FmsFormSubmission" ADD CONSTRAINT "FmsFormSubmission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FmsFormSubmission" ADD CONSTRAINT "FmsFormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "FmsForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FmsFormSubmission" ADD CONSTRAINT "FmsFormSubmission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FmsInstance" ADD CONSTRAINT "FmsInstance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FmsInstance" ADD CONSTRAINT "FmsInstance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FmsTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FmsInstance" ADD CONSTRAINT "FmsInstance_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "FmsFormSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FmsStepState" ADD CONSTRAINT "FmsStepState_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "FmsInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FmsStepState" ADD CONSTRAINT "FmsStepState_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "FmsTemplateStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FmsStepState" ADD CONSTRAINT "FmsStepState_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FmsStepState" ADD CONSTRAINT "FmsStepState_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FmsStepAttachment" ADD CONSTRAINT "FmsStepAttachment_stepStateId_fkey" FOREIGN KEY ("stepStateId") REFERENCES "FmsStepState"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FmsStepAttachment" ADD CONSTRAINT "FmsStepAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
