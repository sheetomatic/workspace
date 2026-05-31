import { after } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { handleWhatsAppWebhook } from "@/lib/whatsapp-bot/process-message";
import { normalizeWhatsAppWebhookPayload } from "@/lib/whatsapp-webhook-normalize";

export const maxDuration = 60;

function verifyMetaSignature(rawBody: string, signatureHeader: string | null) {
  const appSecret = process.env.META_APP_SECRET?.trim();
  if (!appSecret) {
    return true;
  }

  if (!signatureHeader?.startsWith("sha256=")) {
    return true;
  }

  const expected = createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");
  const received = signatureHeader.slice(7);

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim();

  if (
    mode === "subscribe" &&
    verifyToken &&
    token === verifyToken &&
    challenge
  ) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyMetaSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const normalized = normalizeWhatsAppWebhookPayload(payload);
  if (!normalized) {
    console.warn("whatsapp webhook: unrecognized payload shape");
    return NextResponse.json({ ok: true, ignored: true });
  }

  after(async () => {
    try {
      await handleWhatsAppWebhook(normalized);
    } catch (error) {
      console.error("whatsapp webhook background", error);
    }
  });

  return NextResponse.json({ ok: true, queued: true });
}
