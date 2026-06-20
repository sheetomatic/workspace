import { after } from "next/server";
import { NextResponse } from "next/server";
import { handleWhatsAppWebhook } from "@/lib/whatsapp-bot/process-message";
import { verifyWhatsAppWebhookRequest } from "@/lib/whatsapp-webhook-auth";
import { normalizeWhatsAppWebhookPayload } from "@/lib/whatsapp-webhook-normalize";

export const maxDuration = 60;

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

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const auth = await verifyWhatsAppWebhookRequest(
    request,
    rawBody,
    signature,
    payload,
  );

  if (!auth.ok) {
    console.warn("whatsapp webhook: rejected", auth.reason);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
