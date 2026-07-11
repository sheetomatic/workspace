import { after } from "next/server";
import { NextResponse } from "next/server";
import { processTelegramLeadUpdate } from "@/lib/leads/telegram-leads";

export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ secret: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { secret } = await context.params;
  if (!secret?.trim()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // When setWebhook registered secret_token, Telegram sends this header.
  const headerSecret = request.headers.get("x-telegram-bot-api-secret-token");
  if (headerSecret && headerSecret !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  after(async () => {
    try {
      await processTelegramLeadUpdate({
        webhookSecret: secret,
        update: payload,
      });
    } catch (error) {
      console.error("telegram leads webhook", error);
    }
  });

  return NextResponse.json({ ok: true });
}
