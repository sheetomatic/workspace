import { after } from "next/server";
import { NextResponse } from "next/server";
import { processJustdialLeadPush } from "@/lib/leads/justdial";

export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ secret: string }>;
};

function queueJustdial(secret: string, payload: unknown) {
  after(async () => {
    try {
      await processJustdialLeadPush({
        webhookSecret: secret,
        payload,
      });
    } catch (error) {
      console.error("justdial leads webhook", error);
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
  if (Object.keys(payload).length > 0) {
    queueJustdial(secret, payload);
  }
  return NextResponse.json({ ok: true, listener: "justdial-leads" });
}

export async function POST(request: Request, context: RouteContext) {
  const { secret } = await context.params;
  if (!secret?.trim()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let payload: unknown = {};
  try {
    if (contentType.includes("application/json")) {
      payload = await request.json();
    } else {
      const text = await request.text();
      const params = new URLSearchParams(text);
      payload = Object.fromEntries(params.entries());
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  queueJustdial(secret, payload);
  return NextResponse.json({ ok: true });
}
