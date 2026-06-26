-- Organization plan subscription metadata (billing lifecycle on Organization)

CREATE TYPE "PlanSubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED');
CREATE TYPE "PlanBillingPeriod" AS ENUM ('MONTHLY', 'ANNUAL');

ALTER TABLE "Organization"
  ADD COLUMN "planStatus" "PlanSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "billingPeriod" "PlanBillingPeriod" NOT NULL DEFAULT 'MONTHLY';
