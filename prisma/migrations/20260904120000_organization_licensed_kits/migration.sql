-- CreateEnum
CREATE TYPE "LicensedKitStatus" AS ENUM ('REQUESTED', 'ACTIVE', 'PAST_DUE', 'CANCELLED');

-- CreateTable
CREATE TABLE "OrganizationLicensedKit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kitKey" TEXT NOT NULL,
    "status" "LicensedKitStatus" NOT NULL DEFAULT 'REQUESTED',
    "billingPeriod" "PlanBillingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "ratePaise" INTEGER NOT NULL DEFAULT 0,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "renewalAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "grantedByUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationLicensedKit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationLicensedKit_organizationId_kitKey_key" ON "OrganizationLicensedKit"("organizationId", "kitKey");

-- CreateIndex
CREATE INDEX "OrganizationLicensedKit_organizationId_status_idx" ON "OrganizationLicensedKit"("organizationId", "status");

-- CreateIndex
CREATE INDEX "OrganizationLicensedKit_kitKey_status_idx" ON "OrganizationLicensedKit"("kitKey", "status");

-- AddForeignKey
ALTER TABLE "OrganizationLicensedKit" ADD CONSTRAINT "OrganizationLicensedKit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
