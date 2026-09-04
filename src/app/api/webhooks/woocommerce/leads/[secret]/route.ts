import { after } from "next/server";
import { NextResponse } from "next/server";
import { processWooCommerceLeadWebhook } from "@/lib/leads/woocommerce";

export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ secret: string }>;
};

export async function GET() {
  return NextResponse.json({ ok: true, listener: "woocommerce-leads" });
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

  after(async () => {
    try {
      await processWooCommerceLeadWebhook({
        webhookSecret: secret,
        payload,
        signatureHeader: request.headers.get("x-wc-webhook-signature"),
        rawBody,
      });
    } catch (error) {
      console.error("woocommerce leads webhook", error);
    }
  });

  return NextResponse.json({ ok: true });
}
