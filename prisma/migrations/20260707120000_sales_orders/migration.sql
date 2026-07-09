-- Sales orders and leads-to-delivery FMS links

CREATE TYPE "SalesOrderStatus" AS ENUM (
  'DRAFT',
  'CONFIRMED',
  'STOCK_CHECK',
  'PO_PENDING',
  'READY_TO_DISPATCH',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED'
);

CREATE TYPE "SalesOrderFmsRole" AS ENUM (
  'SALES_ORDER',
  'STOCK_CHECK',
  'PURCHASE_ORDER',
  'DISPATCH'
);

CREATE TABLE "SalesOrder" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "quotationId" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "status" "SalesOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "lineItems" JSONB NOT NULL DEFAULT '[]',
  "shortageSnapshot" JSONB,
  "dispatchShareToken" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesOrderFmsLink" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "salesOrderId" TEXT NOT NULL,
  "fmsInstanceId" TEXT NOT NULL,
  "role" "SalesOrderFmsRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SalesOrderFmsLink_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "FmsInstance" ADD COLUMN "salesOrderId" TEXT;

CREATE UNIQUE INDEX "SalesOrder_dispatchShareToken_key" ON "SalesOrder"("dispatchShareToken");
CREATE UNIQUE INDEX "SalesOrder_organizationId_orderNumber_key" ON "SalesOrder"("organizationId", "orderNumber");
CREATE INDEX "SalesOrder_organizationId_status_idx" ON "SalesOrder"("organizationId", "status");
CREATE INDEX "SalesOrder_leadId_idx" ON "SalesOrder"("leadId");
CREATE INDEX "SalesOrder_quotationId_idx" ON "SalesOrder"("quotationId");

CREATE UNIQUE INDEX "SalesOrderFmsLink_fmsInstanceId_key" ON "SalesOrderFmsLink"("fmsInstanceId");
CREATE INDEX "SalesOrderFmsLink_organizationId_salesOrderId_idx" ON "SalesOrderFmsLink"("organizationId", "salesOrderId");
CREATE INDEX "SalesOrderFmsLink_salesOrderId_idx" ON "SalesOrderFmsLink"("salesOrderId");

CREATE INDEX "FmsInstance_salesOrderId_idx" ON "FmsInstance"("salesOrderId");

ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "InboundLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_quotationId_fkey"
  FOREIGN KEY ("quotationId") REFERENCES "InboundLeadQuotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SalesOrderFmsLink" ADD CONSTRAINT "SalesOrderFmsLink_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesOrderFmsLink" ADD CONSTRAINT "SalesOrderFmsLink_salesOrderId_fkey"
  FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesOrderFmsLink" ADD CONSTRAINT "SalesOrderFmsLink_fmsInstanceId_fkey"
  FOREIGN KEY ("fmsInstanceId") REFERENCES "FmsInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FmsInstance" ADD CONSTRAINT "FmsInstance_salesOrderId_fkey"
  FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
