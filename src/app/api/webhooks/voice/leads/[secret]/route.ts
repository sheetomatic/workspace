import { after } from "next/server";
import { NextResponse } from "next/server";
import { processVoiceLeadWebhook } from "@/lib/leads/voice-receptionist";

export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ secret: string }>;
};

async function readPayload(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      return await request.json();
    }
    const text = await request.text();
    if (!text.trim()) return {};
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return Object.fromEntries(new URLSearchParams(text).entries());
    }
  } catch {
    return {};
  }
}

function queueVoice(secret: string, payload: unknown, leadId: string | null) {
  after(async () => {
    try {
      await processVoiceLeadWebhook({
        webhookSecret: secret,
        payload,
        leadIdFromQuery: leadId,
      });
    } catch (error) {
      console.error("voice receptionist webhook", error);
    }
  });
}

export async function GET(request: Request, context: RouteContext) {
  const { secret } = await context.params;
  if (!secret?.trim()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const url = new URL(request.url);
  const payload = Object.fromEntries(url.searchParams.entries());
  const leadId = url.searchParams.get("leadId");
  if (Object.keys(payload).length > 0) {
    queueVoice(secret, payload, leadId);
  }
  return NextResponse.json({ ok: true, listener: "voice-receptionist" });
}

export async function POST(request: Request, context: RouteContext) {
  const { secret } = await context.params;
  if (!secret?.trim()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const url = new URL(request.url);
  const payload = await readPayload(request);
  const merged: Record<string, unknown> =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? { ...(payload as Record<string, unknown>) }
      : { payload };
  const leadId = url.searchParams.get("leadId");
  if (leadId && !merged.leadId) {
    merged.leadId = leadId;
  }
  queueVoice(secret, merged, leadId);
  return NextResponse.json({ ok: true });
}
