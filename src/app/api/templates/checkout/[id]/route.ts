import { NextResponse } from "next/server";
import {
  checkoutAccessHash,
  ownedCheckout,
  publicCheckout,
  recordCapturedPayment,
  emailPaidCheckout,
  refreshCheckoutPayment,
} from "@/lib/templates/checkout";
import {
  checkCheckoutRequest,
  checkoutJson,
  privateHeaders,
} from "@/lib/templates/http";
import { verifyHmac } from "@/lib/templates/gateway";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    await checkCheckoutRequest(request);
    const { id } = await context.params;
    const owned = await ownedCheckout(id, checkoutAccessHash(request));
    try {
      const order = await refreshCheckoutPayment(owned);
      if (order.paidAt) await emailPaidCheckout(id).catch(() => undefined);
      return NextResponse.json(
        publicCheckout(await ownedCheckout(id, checkoutAccessHash(request))),
        { headers: privateHeaders },
      );
    } catch {
      return NextResponse.json(
        {
          error:
            "Unable to confirm payment status with Razorpay. Do not pay again if debited; retry this status check shortly.",
        },
        { status: 503, headers: privateHeaders },
      );
    }
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
    return NextResponse.json(
      publicCheckout(await ownedCheckout(paid.id, checkoutAccessHash(request))),
      { headers: privateHeaders },
    );
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
