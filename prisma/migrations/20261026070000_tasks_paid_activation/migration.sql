-- Additive only; preserves existing purchases and organizations.
ALTER TABLE "TemplateCheckout" ADD COLUMN "emailFirstAttemptAt" TIMESTAMP(3),
  ADD COLUMN "activatedOrganizationId" TEXT,
  ADD COLUMN "activatedAt" TIMESTAMP(3),
  ADD COLUMN "accessEndsAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "TemplateCheckout_activatedOrganizationId_key" ON "TemplateCheckout"("activatedOrganizationId");
ALTER TABLE "TemplateCheckout" ADD CONSTRAINT "TemplateCheckout_activatedOrganizationId_fkey"
  FOREIGN KEY ("activatedOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
