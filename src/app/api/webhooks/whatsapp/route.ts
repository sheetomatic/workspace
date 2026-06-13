import { after } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { handleWhatsAppWebhook } from "@/lib/whatsapp-bot/process-message";
import { normalizeWhatsAppWebhookPayload } from "@/lib/whatsapp-webhook-normalize";

export const maxDuration = 60;

function verifyMetaSignature(rawBody: string, signatureHeader: string | null) {
  const appSecret = process.env.META_APP_SECRET?.trim();
  if (!appSecret) {
    return false;
  }

  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
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

/** Sheetomatic WhatsApp / Meta callback URL with verify token (use when Meta signature is unavailable). */
function verifyWebhookIngressToken(request: Request) {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim();
  if (!verifyToken) {
    return false;
  }

  const url = new URL(request.url);
  const tokenFromQuery = url.searchParams.get("token")?.trim();
  const tokenFromHeader = request.headers.get("x-webhook-verify-token")?.trim();
  const provided = tokenFromQuery ?? tokenFromHeader;
  if (!provided) {
    return false;
  }

  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(verifyToken));
  } catch {
    return false;
  }
}

function verifyWebhookRequest(
  request: Request,
  rawBody: string,
  signatureHeader: string | null,
) {
  if (verifyMetaSignature(rawBody, signatureHeader)) {
    return { ok: true as const };
  }

  if (verifyWebhookIngressToken(request)) {
    return { ok: true as const };
  }

  const appSecret = process.env.META_APP_SECRET?.trim();
  if (signatureHeader && !appSecret) {
    return {
      ok: false as const,
      reason: "missing_meta_app_secret",
    };
  }

  if (signatureHeader) {
    return { ok: false as const, reason: "invalid_signature" };
  }

  return { ok: false as const, reason: "missing_auth" };
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
  const auth = verifyWebhookRequest(request, rawBody, signature);

  if (!auth.ok) {
    console.warn("whatsapp webhook: rejected", auth.reason);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
