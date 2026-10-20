import { NextResponse } from "next/server";
import {
  checkoutAccessHash,
  ownedCheckout,
  publicCheckout,
  recordCapturedPayment,
  emailPaidCheckout,
} from "@/lib/templates/checkout";
import {
  checkCheckoutRequest,
  checkoutJson,
  privateHeaders,
} from "@/lib/templates/http";
import { verifyHmac } from "@/lib/templates/gateway";
import { claimHostedPayment } from "@/lib/templates/hosted-checkout";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    await checkCheckoutRequest(request);
    const { id } = await context.params;
    return NextResponse.json(
      publicCheckout(await ownedCheckout(id, checkoutAccessHash(request))),
      { headers: privateHeaders },
    );
  } catch {
    return NextResponse.json(
      { error: "Order unavailable." },
      { status: 404, headers: privateHeaders },
    );
  }
}

export async function POST(request: Request, context: Context) {
  try {
    await checkCheckoutRequest(request);
    const { id } = await context.params;
    const order = await ownedCheckout(id, checkoutAccessHash(request));
    const body = (await checkoutJson(request)) as Record<string, unknown>;
    if (order.paymentMode === "hosted_manual") {
      const pending = await claimHostedPayment(
        id,
        checkoutAccessHash(request),
        body?.paymentReference,
      );
      return NextResponse.json(publicCheckout(pending), {
        headers: privateHeaders,
      });
    }
    if (
      !body ||
      typeof body.razorpay_payment_id !== "string" ||
      typeof body.razorpay_signature !== "string" ||
      body.razorpay_order_id !== order.gatewayOrderId ||
      !verifyHmac(
        `${order.gatewayOrderId}|${body.razorpay_payment_id}`,
        body.razorpay_signature,
        process.env.RAZORPAY_KEY_SECRET ?? "",
      )
    )
      throw new Error("Invalid payment signature.");
    const paid = await recordCapturedPayment(id, body.razorpay_payment_id);
    await emailPaidCheckout(id).catch(() => undefined);
    return NextResponse.json(publicCheckout(paid), { headers: privateHeaders });
  } catch {
    return NextResponse.json(
      {
        error:
          "Payment is not yet verified. Do not pay again; check payment status shortly or contact support.",
      },
      { status: 409, headers: privateHeaders },
    );
  }
}
