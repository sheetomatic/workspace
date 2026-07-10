-- CreateEnum
CREATE TYPE "OrgExpenseCategory" AS ENUM (
  'API_CURSOR',
  'API_OPENAI',
  'API_WHATSAPP',
  'MARKETING',
  'SALARY',
  'OFFICE_RENT',
  'MOBILE',
  'ELECTRICITY',
  'SUBSCRIPTION_NETFLIX',
  'SUBSCRIPTION_PRIME',
  'SUBSCRIPTION_OTHER',
  'PHONE_NUMBERS_PLAN',
  'FUEL',
  'VEHICLE_CAR',
  'VEHICLE_BIKE',
  'VEHICLE_SCOOTY',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "OrgExpenseRecurrence" AS ENUM ('ONE_TIME', 'MONTHLY');

-- CreateTable
CREATE TABLE "OrgExpenseEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "category" "OrgExpenseCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "recurrence" "OrgExpenseRecurrence" NOT NULL DEFAULT 'ONE_TIME',
    "quantity" INTEGER,
    "vendor" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgExpenseEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrgExpenseEntry_organizationId_expenseDate_idx" ON "OrgExpenseEntry"("organizationId", "expenseDate");

-- CreateIndex
CREATE INDEX "OrgExpenseEntry_organizationId_category_idx" ON "OrgExpenseEntry"("organizationId", "category");

-- AddForeignKey
ALTER TABLE "OrgExpenseEntry" ADD CONSTRAINT "OrgExpenseEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgExpenseEntry" ADD CONSTRAINT "OrgExpenseEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
