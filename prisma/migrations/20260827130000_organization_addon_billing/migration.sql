-- CreateTable
CREATE TABLE "OrganizationAddonBilling" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "module" "WorkspaceModule" NOT NULL,
    "ratePaise" INTEGER NOT NULL DEFAULT 0,
    "billingPeriod" "PlanBillingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationAddonBilling_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationAddonBilling_organizationId_module_key" ON "OrganizationAddonBilling"("organizationId", "module");

-- CreateIndex
CREATE INDEX "OrganizationAddonBilling_organizationId_idx" ON "OrganizationAddonBilling"("organizationId");

-- AddForeignKey
ALTER TABLE "OrganizationAddonBilling" ADD CONSTRAINT "OrganizationAddonBilling_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
