import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendPlainEmail } from "@/lib/integrations/email";
import { logInboundLeadActivity } from "@/lib/leads/activity";
import {
  buildDispatchSlipPublicUrl,
  createDispatchShareToken,
} from "@/lib/sales-orders/dispatch-tokens";
import { getSalesOrderDetail } from "@/lib/sales-orders/queries";

export type DispatchSlipData = {
  orderNumber: string;
  customerName: string;
  customerPhone: string | null;
  deliveryAddress: string;
  quotationNumber: string;
  lineItems: unknown;
  totalAmount: number;
  paymentTerms: string | null;
  publicUrl: string;
  organizationName: string;
};

export async function buildDispatchSlipData(
  organizationId: string,
  salesOrderId: string,
): Promise<DispatchSlipData | null> {
  const order = await getSalesOrderDetail(organizationId, salesOrderId);
  if (!order) {
    return null;
  }

  const shareToken =
    order.dispatchShareToken ??
    (
      await prisma.salesOrder.update({
        where: { id: order.id },
        data: { dispatchShareToken: createDispatchShareToken() },
        select: { dispatchShareToken: true },
      })
    ).dispatchShareToken;

  const deliveryAddress = [order.lead.address, order.lead.zipCode]
    .filter(Boolean)
    .join(", ");

  return {
    orderNumber: order.orderNumber,
    customerName: order.lead.name ?? "Customer",
    customerPhone: order.lead.phone,
    deliveryAddress,
    quotationNumber: order.quotation.quotationNumber,
    lineItems: order.lineItems,
    totalAmount: Number(order.quotation.totalAmount),
    paymentTerms: order.quotation.paymentTerms,
    publicUrl: buildDispatchSlipPublicUrl(shareToken!),
    organizationName: "",
  };
}

export function buildDispatchSlipShareMessage(data: DispatchSlipData) {
  return [
    `Hi ${data.customerName},`,
    "",
    `Your order ${data.orderNumber} has been dispatched.`,
    `Quotation ref: ${data.quotationNumber}`,
    `Total: ₹${data.totalAmount.toLocaleString("en-IN")}`,
    "",
    `Dispatch slip: ${data.publicUrl}`,
    "",
    "— Sheetomatic",
  ].join("\n");
}

export async function ensureDispatchShareToken(
  organizationId: string,
  salesOrderId: string,
) {
  const order = await prisma.salesOrder.findFirst({
    where: { id: salesOrderId, organizationId },
    select: { dispatchShareToken: true },
  });
  if (!order) {
    return null;
  }
  if (order.dispatchShareToken) {
    return order.dispatchShareToken;
  }
  const token = createDispatchShareToken();
  await prisma.salesOrder.update({
    where: { id: salesOrderId },
    data: { dispatchShareToken: token },
  });
  return token;
}

export async function sendDispatchSlipNotifications(params: {
  organizationId: string;
  salesOrderId: string;
  actorUserId?: string;
}) {
  const order = await prisma.salesOrder.findFirst({
    where: { id: params.salesOrderId, organizationId: params.organizationId },
    include: {
      lead: { select: { id: true, name: true, phone: true, email: true } },
      quotation: { select: { quotationNumber: true, totalAmount: true } },
      organization: { select: { name: true } },
    },
  });

  if (!order) {
    return { ok: false as const, message: "Sales order not found" };
  }

  const slip = await buildDispatchSlipData(params.organizationId, order.id);
  if (!slip) {
    return { ok: false as const, message: "Could not build dispatch slip" };
  }
  slip.organizationName = order.organization.name;

  const message = buildDispatchSlipShareMessage(slip);
  const results: { whatsapp?: string; email?: boolean } = {};

  const phone = order.lead.phone?.replace(/\D/g, "") ?? "";
  if (phone) {
    results.whatsapp = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  if (order.lead.email?.trim()) {
    const emailResult = await sendPlainEmail({
      toEmail: order.lead.email.trim(),
      subject: `Dispatch slip — ${order.orderNumber}`,
      text: message,
    });
    results.email = emailResult.sent;
  }

  if (params.actorUserId) {
    await logInboundLeadActivity({
      organizationId: params.organizationId,
      leadId: order.leadId,
      type: "WHATSAPP",
      body: `Dispatch slip sent for ${order.orderNumber}`,
      createdByUserId: params.actorUserId,
      metadata: { salesOrderId: order.id, publicUrl: slip.publicUrl },
    });
  }

  return { ok: true as const, slip, results };
}

export async function sendDispatchSlipWhatsApp(
  organizationId: string,
  salesOrderId: string,
  actorUserId: string,
) {
  const result = await sendDispatchSlipNotifications({
    organizationId,
    salesOrderId,
    actorUserId,
  });
  if (!result.ok) {
    return result;
  }
  if (!result.results.whatsapp) {
    return { ok: false as const, message: "Lead has no phone number for WhatsApp." };
  }
  return {
    ok: true as const,
    waUrl: result.results.whatsapp,
    publicUrl: result.slip.publicUrl,
  };
}

export async function sendDispatchSlipEmail(
  organizationId: string,
  salesOrderId: string,
  actorUserId: string,
) {
  const order = await prisma.salesOrder.findFirst({
    where: { id: salesOrderId, organizationId },
    include: { lead: { select: { email: true } } },
  });
  if (!order?.lead.email?.trim()) {
    return { ok: false as const, message: "Lead has no email address." };
  }

  const result = await sendDispatchSlipNotifications({
    organizationId,
    salesOrderId,
    actorUserId,
  });
  if (!result.ok) {
    return result;
  }
  if (!result.results.email) {
    return {
      ok: false as const,
      message: "Email is not configured or failed to send.",
    };
  }
  return { ok: true as const, publicUrl: result.slip.publicUrl };
}
