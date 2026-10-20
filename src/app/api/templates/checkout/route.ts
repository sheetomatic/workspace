import { NextResponse } from "next/server";
import {
  checkoutAccessHash,
  createCartCheckout,
  publicCheckout,
} from "@/lib/templates/checkout";
import {
  checkCheckoutRequest,
  checkoutJson,
  privateHeaders,
} from "@/lib/templates/http";
import { templateCheckoutReady } from "@/lib/templates/gateway";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!templateCheckoutReady())
    return NextResponse.json(
      {
        error:
          "Online checkout is being configured. No payment has been taken.",
      },
      { status: 503, headers: privateHeaders },
    );
  try {
    await checkCheckoutRequest(request);
    const order = await createCartCheckout(
      await checkoutJson(request),
      checkoutAccessHash(request),
    );
    return NextResponse.json(publicCheckout(order), {
      headers: privateHeaders,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Checkout could not be created. Check your billing details and template availability. If this persists, contact support before retrying.",
      },
      { status: 400, headers: privateHeaders },
    );
  }
}
