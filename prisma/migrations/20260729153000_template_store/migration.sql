-- Template store: products + orders with human payment confirmation

CREATE TYPE "TemplateProductType" AS ENUM ('APPSHEET', 'SHEETS', 'EXCEL');
CREATE TYPE "TemplateOrderStatus" AS ENUM ('PENDING', 'PAYMENT_RECEIVED', 'FULFILLED', 'CANCELLED');

CREATE TABLE "TemplateProduct" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TemplateProductType" NOT NULL,
    "priceInr" INTEGER NOT NULL,
    "description" TEXT,
    "copyLink" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TemplateOrder" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "paymentRef" TEXT,
    "notes" TEXT,
    "status" "TemplateOrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentReceivedAt" TIMESTAMP(3),
    "paymentReceivedById" TEXT,
    "fulfillmentEmailSentAt" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TemplateProduct_slug_key" ON "TemplateProduct"("slug");
CREATE INDEX "TemplateProduct_type_active_sortOrder_idx" ON "TemplateProduct"("type", "active", "sortOrder");
CREATE INDEX "TemplateOrder_status_createdAt_idx" ON "TemplateOrder"("status", "createdAt");
CREATE INDEX "TemplateOrder_customerEmail_idx" ON "TemplateOrder"("customerEmail");
CREATE INDEX "TemplateOrder_productId_status_idx" ON "TemplateOrder"("productId", "status");

ALTER TABLE "TemplateOrder" ADD CONSTRAINT "TemplateOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "TemplateProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
