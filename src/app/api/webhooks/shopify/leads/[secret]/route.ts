import { after } from "next/server";
import { NextResponse } from "next/server";
import { processShopifyLeadWebhook } from "@/lib/leads/shopify";

export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ secret: string }>;
};

export async function GET() {
  return NextResponse.json({ ok: true, listener: "shopify-leads" });
}

export async function POST(request: Request, context: RouteContext) {
  const { secret } = await context.params;
  if (!secret?.trim()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rawBody = await request.text();
  let payload: unknown = {};
  try {
    payload = rawBody ? (JSON.parse(rawBody) as unknown) : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const topic = request.headers.get("x-shopify-topic");
  const hmac = request.headers.get("x-shopify-hmac-sha256");

  after(async () => {
    try {
      await processShopifyLeadWebhook({
        webhookSecret: secret,
        payload,
        topic,
        hmacHeader: hmac,
        rawBody,
      });
    } catch (error) {
      console.error("shopify leads webhook", error);
    }
  });

  return NextResponse.json({ ok: true });
}
