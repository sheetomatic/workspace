import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { spawnFmsForSalesOrder } from "@/lib/fms/handoff-engine";
import { logInboundLeadActivity } from "@/lib/leads/activity";
import { nextSalesOrderNumber } from "@/lib/sales-orders/order-number";

function quotationLinesToTableRows(
  lines: Array<{
    serviceCategory: string;
    subCategory: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    lineTotal: Prisma.Decimal;
  }>,
) {
  return lines.map((line) => ({
    item_name: `${line.serviceCategory} — ${line.subCategory}`,
    quantity: String(line.quantity),
    rate: String(Number(line.unitPrice)),
    line_total: String(Number(line.lineTotal)),
  }));
}

function buildSalesOrderIntakeValues(params: {
  lead: {
    name: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    company: string | null;
    zipCode: string | null;
  };
  quotation: {
    quotationNumber: string;
    paymentTerms: string | null;
    projectStartDate: Date | null;
    endDate: Date | null;
    totalAmount: Prisma.Decimal;
    lines: Array<{
      serviceCategory: string;
      subCategory: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
    }>;
  };
  orderNumber: string;
  advanceAmount: number;
}) {
  const deliveryAddress = [
    params.lead.company,
    params.lead.address,
    params.lead.zipCode,
  ]
    .filter(Boolean)
    .join(", ");

  const total = Number(params.quotation.totalAmount);
  const balanceDue = Math.max(0, total - params.advanceAmount);
  const deliveryDate =
    params.quotation.endDate ??
    params.quotation.projectStartDate ??
    new Date();

  return {
    customer_name: params.lead.name ?? "",
    phone: params.lead.phone ?? "",
    email: params.lead.email ?? "",
    delivery_address: deliveryAddress,
    quotation_number: params.quotation.quotationNumber,
    customer_po: "",
    delivery_date: deliveryDate.toISOString().slice(0, 10),
    payment_terms: params.quotation.paymentTerms ?? "",
    line_items: quotationLinesToTableRows(params.quotation.lines),
    advance_received: params.advanceAmount,
    balance_due: balanceDue,
    sales_order_number: params.orderNumber,
  };
}

export async function createSalesOrderFromLockedQuotation(params: {
  organizationId: string;
  leadId: string;
  quotationId: string;
  advanceAmount: number;
  actorUserId: string;
}) {
  const quotation = await prisma.inboundLeadQuotation.findFirst({
    where: {
      id: params.quotationId,
      organizationId: params.organizationId,
      leadId: params.leadId,
      lockedAt: { not: null },
    },
    include: {
      lead: true,
      lines: true,
    },
  });

  if (!quotation) {
    throw new Error("Locked quotation not found");
  }

  const existing = await prisma.salesOrder.findFirst({
    where: { organizationId: params.organizationId, quotationId: quotation.id },
  });
  if (existing) {
    return existing;
  }

  const orderNumber = await nextSalesOrderNumber(params.organizationId);
  const lineItems = quotationLinesToTableRows(quotation.lines);

  const salesOrder = await prisma.salesOrder.create({
    data: {
      organizationId: params.organizationId,
      leadId: params.leadId,
      quotationId: quotation.id,
      orderNumber,
      status: "DRAFT",
      lineItems: lineItems as Prisma.InputJsonValue,
    },
  });

  const intakeValues = buildSalesOrderIntakeValues({
    lead: quotation.lead,
    quotation,
    orderNumber,
    advanceAmount: params.advanceAmount,
  });

  await spawnFmsForSalesOrder({
    salesOrderId: salesOrder.id,
    organizationId: params.organizationId,
    role: "SALES_ORDER",
    submitterUserId: params.actorUserId,
    values: intakeValues,
  });

  await logInboundLeadActivity({
    organizationId: params.organizationId,
    leadId: params.leadId,
    type: "QUOTATION",
    body: `Sales order ${orderNumber} created from ${quotation.quotationNumber}`,
    createdByUserId: params.actorUserId,
    metadata: { salesOrderId: salesOrder.id, quotationId: quotation.id },
  });

  return salesOrder;
}
