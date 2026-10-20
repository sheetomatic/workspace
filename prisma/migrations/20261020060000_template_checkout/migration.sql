-- Additive only. Does not modify existing products, orders, billing or customers.
CREATE TABLE "TemplateCheckout" (
  "id" TEXT NOT NULL,
  "accessHash" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "totalPaise" INTEGER NOT NULL,
  "gatewayOrderId" TEXT,
  "gatewayPaymentId" TEXT,
  "paidAt" TIMESTAMP(3),
  "invoiceNumber" TEXT,
  "emailSentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TemplateCheckout_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TemplateCheckout_total_positive" CHECK ("totalPaise" > 0)
);
CREATE UNIQUE INDEX "TemplateCheckout_accessHash_key" ON "TemplateCheckout"("accessHash");
CREATE UNIQUE INDEX "TemplateCheckout_gatewayOrderId_key" ON "TemplateCheckout"("gatewayOrderId");
CREATE UNIQUE INDEX "TemplateCheckout_gatewayPaymentId_key" ON "TemplateCheckout"("gatewayPaymentId");
CREATE UNIQUE INDEX "TemplateCheckout_invoiceNumber_key" ON "TemplateCheckout"("invoiceNumber");
CREATE INDEX "TemplateCheckout_organizationId_createdAt_idx" ON "TemplateCheckout"("organizationId", "createdAt");
CREATE TABLE "TemplateInvoiceCounter" (
  "year" TEXT NOT NULL,
  "value" INTEGER NOT NULL,
  CONSTRAINT "TemplateInvoiceCounter_pkey" PRIMARY KEY ("year")
);
