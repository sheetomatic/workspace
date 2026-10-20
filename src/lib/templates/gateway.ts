import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/** Hosted checkout reuses Courses; an operator must verify the merchant receipt. */
export function templateCheckoutReady() {
  return process.env.TEMPLATE_CHECKOUT_ENABLED !== "false";
}

export function templateGatewayReady() {
  return (
    process.env.TEMPLATE_CHECKOUT_ENABLED === "true" &&
    Boolean(
      process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET &&
      process.env.RAZORPAY_WEBHOOK_SECRET,
    )
  );
}

export function verifyHmac(value: string, signature: string, secret: string) {
  if (!secret || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  return timingSafeEqual(
    Buffer.from(signature, "hex"),
    createHmac("sha256", secret).update(value).digest(),
  );
}

export async function razorpayRequest<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  const key = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key || !secret) throw new Error("Payment gateway is not configured.");
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok)
    throw new Error("Payment gateway request failed. Please try again later.");
  return response.json() as Promise<T>;
}

export type GatewayPayment = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  captured: boolean;
  amount_refunded: number;
};

export function assertCapturedPayment(
  payment: GatewayPayment,
  expected: { orderId: string; amount: number },
) {
  if (
    !/^pay_[a-zA-Z0-9]+$/.test(payment.id) ||
    payment.order_id !== expected.orderId ||
    payment.amount !== expected.amount ||
    payment.currency !== "INR" ||
    payment.status !== "captured" ||
    payment.captured !== true ||
    payment.amount_refunded !== 0
  ) {
    throw new Error(
      "Payment is not captured for the expected order and amount.",
    );
  }
}
