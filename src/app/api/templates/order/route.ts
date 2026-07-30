import { NextResponse } from "next/server";
import { createTemplateOrder } from "@/lib/templates/store";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  return `template-order:${ip}`;
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  const rate = await checkRateLimit(clientKey(request), 8, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${rate.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  let body: {
    productId?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    company?: string;
    city?: string;
    requirement?: string;
    paymentRef?: string;
    notes?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const productId = typeof body.productId === "string" ? body.productId.trim() : "";
  const customerName =
    typeof body.customerName === "string" ? body.customerName.trim() : "";
  const customerEmail =
    typeof body.customerEmail === "string" ? body.customerEmail.trim() : "";
  const customerPhone =
    typeof body.customerPhone === "string" ? body.customerPhone.trim() : "";
  const company = typeof body.company === "string" ? body.company.trim() : undefined;
  const city = typeof body.city === "string" ? body.city.trim() : undefined;
  const requirement =
    typeof body.requirement === "string" ? body.requirement.trim() : undefined;
  const paymentRef =
    typeof body.paymentRef === "string" ? body.paymentRef.trim() : undefined;
  const notes = typeof body.notes === "string" ? body.notes.trim() : undefined;

  if (!productId || !customerName || !customerEmail || !customerPhone) {
    return NextResponse.json(
      { error: "Name, email, phone, and template are required." },
      { status: 400 },
    );
  }
  if (!isEmail(customerEmail)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  try {
    const order = await createTemplateOrder({
      productId,
      customerName,
      customerEmail,
      customerPhone,
      company,
      city,
      requirement,
      paymentRef,
      notes,
    });

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      status: order.status,
      productName: order.product.name,
      priceInr: order.product.priceInr,
      inboundLeadId: order.inboundLeadId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create order.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
