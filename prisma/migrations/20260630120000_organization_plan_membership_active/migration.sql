-- Active membership flag for assignee validation
ALTER TABLE "Membership" ADD COLUMN "deactivatedAt" TIMESTAMP(3);

-- Dedicated organization plan record (1:1 with Organization)
CREATE TABLE "OrganizationPlan" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "plan" "OrgPlan" NOT NULL DEFAULT 'BCI_STARTER',
  "status" "PlanSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "billingPeriod" "PlanBillingPeriod" NOT NULL DEFAULT 'MONTHLY',
  "trialEndsAt" TIMESTAMP(3),
  "renewalAt" TIMESTAMP(3),
  "activatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrganizationPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationPlan_organizationId_key" ON "OrganizationPlan"("organizationId");

ALTER TABLE "OrganizationPlan"
  ADD CONSTRAINT "OrganizationPlan_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "OrganizationPlan" (
  "id",
  "organizationId",
  "plan",
  "status",
  "billingPeriod",
  "activatedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  md5("id" || ':organization-plan')::text,
  "id",
  "plan",
  "planStatus",
  "billingPeriod",
  CASE WHEN "status" = 'ACTIVE' THEN CURRENT_TIMESTAMP ELSE NULL END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Organization";
