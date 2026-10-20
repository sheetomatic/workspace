import "server-only";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getPrimaryOrganization } from "@/lib/platform";
import { resolveQuotationAccount } from "@/lib/leads/seller-account";
import { parseGstin, gstinStateCode } from "@/lib/leads/gst-invoice";
import { sendPlainEmail } from "@/lib/integrations/email";
import {
  cartProductIds,
  cartTotals,
  financialYear,
  parseTemplateBuyer,
  templateInvoiceNumber,
  templatePriceInr,
  TEMPLATE_SAC,
  type TemplateBuyer,
} from "./commerce";
import {
  assertCapturedPayment,
  razorpayRequest,
  templateGatewayReady,
  type GatewayPayment,
} from "./gateway";
import { templateInvoiceHtml } from "./invoice";

export type CheckoutSnapshot = {
  version: 1;
  buyer: TemplateBuyer;
  seller: {
    legalName: string;
    tradeName: string;
    gstin: string;
    addressLines: string[];
    stateCode: string;
  };
  lines: {
    productId: string;
    name: string;
    priceInr: number;
    sac: string;
    copyLink: string;
  }[];
  totals: ReturnType<typeof cartTotals>;
};

export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function checkoutAccessHash(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!token) throw new Error("Order access is required.");
  return hash(token);
}

export function deliverableLink(link: string | null) {
  if (!link) return false;
  try {
    const u = new URL(link);
    return u.protocol === "https:" && !u.username && !u.password;
  } catch {
    return false;
  }
}

export async function createCartCheckout(body: unknown, accessHash: string) {
  if (!templateGatewayReady())
    throw new Error(
      "Online checkout is being configured. No payment has been taken.",
    );
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new Error("Invalid checkout request.");
  const data = body as Record<string, unknown>;
  if (data.acceptedTerms !== true)
    throw new Error("Confirm the template licence and no-customisation terms.");
  const ids = cartProductIds(data.productIds);
  const buyer = parseTemplateBuyer(data.buyer);
  const requestHash = hash(JSON.stringify({ ids, buyer }));
  const prior = await prisma.templateCheckout.findUnique({
    where: { accessHash },
  });
  if (prior) {
    if (prior.requestHash !== requestHash)
      throw new Error(
        "This checkout belongs to a different cart. Start a new checkout.",
      );
    return prior;
  }
  const org = await getPrimaryOrganization();
  if (!org) throw new Error("Seller workspace is not configured.");
  const account = resolveQuotationAccount(org);
  const sellerState = account ? gstinStateCode(account.gstin) : null;
  if (
    !account ||
    !account.legalName ||
    !account.addressLines.length ||
    !sellerState ||
    !parseGstin(account.gstin).ok
  )
    throw new Error("Seller GST profile needs verification.");
  const products = await prisma.templateProduct.findMany({
    where: { id: { in: ids }, active: true },
  });
  if (
    products.length !== ids.length ||
    products.some((p) => !deliverableLink(p.copyLink))
  )
    throw new Error(
      "A template in your cart is unavailable. Remove it before checking out.",
    );
  const lines = ids.map((id) => {
    const p = products.find((p) => p.id === id)!;
    return {
      productId: p.id,
      name: p.name,
      priceInr: templatePriceInr(p.priceInr),
      sac: TEMPLATE_SAC,
      copyLink: p.copyLink!,
    };
  });
  const snapshot: CheckoutSnapshot = {
    version: 1,
    buyer,
    lines,
    seller: {
      legalName: account.legalName,
      tradeName: account.tradeName,
      gstin: account.gstin,
      addressLines: account.addressLines,
      stateCode: sellerState,
    },
    totals: cartTotals(
      lines.map((l) => l.priceInr),
      buyer.stateCode,
      sellerState,
    ),
  };
  const order = await prisma.templateCheckout.create({
    data: {
      accessHash,
      requestHash,
      organizationId: org.id,
      snapshot: snapshot as unknown as Prisma.InputJsonValue,
      totalPaise: snapshot.totals.totalPaise,
    },
  });
  // Persist first: even a timeout leaves a recoverable local record. Never charge a new amount on retry.
  let gateway: { id: string; amount: number; currency: string };
  try {
    gateway = await razorpayRequest<{
      id: string;
      amount: number;
      currency: string;
    }>("orders", {
      amount: order.totalPaise,
      currency: "INR",
      receipt: order.id,
      notes: { template_checkout_id: order.id },
    });
  } catch {
    // The provider may have accepted the order before a network timeout. Never create another on retry.
    return order;
  }
  if (
    !/^order_[a-zA-Z0-9]+$/.test(gateway.id) ||
    gateway.amount !== order.totalPaise ||
    gateway.currency !== "INR"
  )
    throw new Error("Gateway order did not match the cart.");
  return prisma.templateCheckout.update({
    where: { id: order.id },
    data: { gatewayOrderId: gateway.id, paymentState: "ready" },
  });
}

export async function ownedCheckout(id: string, accessHash: string) {
  const order = await prisma.templateCheckout.findFirst({
    where: { id, accessHash },
  });
  if (!order) throw new Error("Order not found or access expired.");
  return order;
}

export async function recordCapturedPayment(
  orderId: string,
  paymentId: string,
) {
  if (!/^pay_[a-zA-Z0-9]+$/.test(paymentId))
    throw new Error("Invalid payment reference.");
  const order = await prisma.templateCheckout.findUniqueOrThrow({
    where: { id: orderId },
  });
  if (!order.gatewayOrderId) throw new Error("Order is not ready for payment.");
  if (order.paidAt) {
    if (order.gatewayPaymentId !== paymentId)
      throw new Error("Payment does not match this invoice.");
    return order;
  }
  const payment = await razorpayRequest<GatewayPayment>(
    `payments/${paymentId}`,
  );
  assertCapturedPayment(payment, {
    orderId: order.gatewayOrderId,
    amount: order.totalPaise,
  });
  if (payment.id !== paymentId) throw new Error("Payment reference mismatch.");
  const now = new Date();
  const paid = await prisma.$transaction(async (tx) => {
    // Concurrent callbacks/webhooks contend on this row. Only one allocates an invoice number.
    const claimed = await tx.templateCheckout.updateMany({
      where: { id: order.id, paidAt: null },
      data: { paidAt: now, gatewayPaymentId: payment.id, paymentState: "paid" },
    });
    if (claimed.count === 1) {
      const year = financialYear(now);
      const counter = await tx.templateInvoiceCounter.upsert({
        where: { year },
        create: { year, value: 1 },
        update: { value: { increment: 1 } },
      });
      await tx.templateCheckout.update({
        where: { id: order.id },
        data: { invoiceNumber: templateInvoiceNumber(year, counter.value) },
      });
    }
    const result = await tx.templateCheckout.findUniqueOrThrow({
      where: { id: order.id },
    });
    if (result.gatewayPaymentId !== paymentId)
      throw new Error("Another payment already owns this invoice.");
    return result;
  });
  return paid;
}

export async function emailPaidCheckout(orderId: string) {
  const order = await prisma.templateCheckout.findUniqueOrThrow({
    where: { id: orderId },
  });
  if (!order.paidAt || !order.invoiceNumber || order.emailSentAt) return;
  const now = new Date();
  // Resend retains idempotency keys for 24h. An uncertain older attempt needs operator reconciliation,
  // not an automatic resend that might duplicate a previously accepted delivery.
  if (
    order.emailAttemptedAt &&
    now.getTime() - order.emailAttemptedAt.getTime() >= 23 * 60 * 60 * 1000
  )
    throw new Error(
      "Email delivery needs reconciliation; verified downloads remain available.",
    );
  const lease = new Date(now.getTime() + 90000);
  const claimed = await prisma.templateCheckout.updateMany({
    where: {
      id: order.id,
      emailSentAt: null,
      OR: [{ emailLeaseUntil: null }, { emailLeaseUntil: { lt: now } }],
    },
    data: {
      emailLeaseUntil: lease,
      emailAttemptedAt: order.emailAttemptedAt ?? now,
    },
  });
  if (!claimed.count)
    throw new Error("Email delivery is already processing. Retry shortly.");
  const s = order.snapshot as unknown as CheckoutSnapshot;
  try {
    const result = await sendPlainEmail({
      idempotencyKey: `template-invoice/${order.id}`,
      toEmail: s.buyer.email,
      subject: `Your Sheetomatic templates · ${order.invoiceNumber}`,
      attachments: [
        {
          filename: `${order.invoiceNumber.replaceAll("/", "-")}.html`,
          content: templateInvoiceHtml(order),
          contentType: "text/html",
        },
      ],
      text: [
        `Hello ${s.buyer.name},`,
        "",
        "Your payment is verified. Your template copy links:",
        ...s.lines.map((l) => `${l.name}: ${l.copyLink}`),
        "",
        `Invoice: ${order.invoiceNumber}`,
        `Paid: INR ${(order.totalPaise / 100).toFixed(2)} (including GST).`,
        "Your GST tax invoice is attached. Open it and choose Print → Save as PDF, or download it from your checkout confirmation page.",
        "Standard templates only. Customisation, setup services and third-party subscriptions are not included.",
        "For your own business use only; not for resale or redistribution.",
        `Support: founder@sheetomatic.com. Order: ${order.id}`,
      ].join("\n"),
    });
    if (result.sent)
      await prisma.templateCheckout.update({
        where: { id: order.id },
        data: { emailSentAt: new Date(), emailLeaseUntil: null },
      });
    else
      throw new Error(
        "Delivery email pending; retry after email configuration is restored.",
      );
  } catch (error) {
    await prisma.templateCheckout.updateMany({
      where: { id: order.id, emailLeaseUntil: lease },
      data: { emailLeaseUntil: null },
    });
    throw error;
  }
}

/** Reconcile directly with the provider. A caller's success/failure/cancel flag is never trusted. */
export async function refreshCheckoutPayment(
  order: Awaited<ReturnType<typeof ownedCheckout>>,
) {
  if (order.paidAt || !order.gatewayOrderId) return order;
  const result = await razorpayRequest<{ items: GatewayPayment[] }>(
    `orders/${order.gatewayOrderId}/payments`,
  );
  if (
    !Array.isArray(result.items) ||
    result.items.some((p) => p.order_id !== order.gatewayOrderId)
  )
    throw new Error("Invalid provider payment list.");
  const captured = result.items.find(
    (p) => p.status === "captured" && p.captured === true,
  );
  if (captured) return recordCapturedPayment(order.id, captured.id);
  const pending = result.items.some((p) => p.status !== "failed");
  const failed =
    result.items.length > 0 && result.items.every((p) => p.status === "failed");
  await prisma.templateCheckout.updateMany({
    where: { id: order.id, paidAt: null },
    data: { paymentState: pending ? "pending" : failed ? "failed" : "ready" },
  });
  return prisma.templateCheckout.findUniqueOrThrow({ where: { id: order.id } });
}

export function publicCheckout(
  order: Awaited<ReturnType<typeof ownedCheckout>>,
) {
  const s = order.snapshot as unknown as CheckoutSnapshot;
  return {
    id: order.id,
    paid: Boolean(order.paidAt),
    paymentState: order.paidAt ? "paid" : order.paymentState,
    emailDelivered: Boolean(order.emailSentAt),
    invoiceNumber: order.invoiceNumber,
    totalPaise: order.totalPaise,
    totals: s.totals,
    lines: s.lines.map((l) => ({
      name: l.name,
      priceInr: l.priceInr,
      ...(order.paidAt ? { copyLink: l.copyLink } : {}),
    })),
    gatewayOrderId: order.gatewayOrderId,
    keyId: process.env.RAZORPAY_KEY_ID,
  };
}
