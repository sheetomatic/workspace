import { NextResponse } from "next/server";
import { checkoutAccessHash, createTasksCheckout, publicCheckout } from "@/lib/templates/checkout";
import { checkCheckoutRequest, checkoutJson, privateHeaders } from "@/lib/templates/http";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await checkCheckoutRequest(request);
    const order = await createTasksCheckout(await checkoutJson(request), checkoutAccessHash(request));
    return NextResponse.json(publicCheckout(order), { headers: privateHeaders });
  } catch {
    return NextResponse.json({ error: "Checkout could not be created. Check users, billing details and accepted terms." }, { status: 400, headers: privateHeaders });
  }
}
