import { after } from "next/server";
import { NextResponse } from "next/server";
import { processTradeIndiaLeadPush } from "@/lib/leads/tradeindia";

export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ secret: string }>;
};

export async function GET() {
  return NextResponse.json({ ok: true, listener: "tradeindia-leads" });
}

export async function POST(request: Request, context: RouteContext) {
  const { secret } = await context.params;
  if (!secret?.trim()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  after(async () => {
    try {
      await processTradeIndiaLeadPush({
        webhookSecret: secret,
        payload,
      });
    } catch (error) {
      console.error("tradeindia leads webhook", error);
    }
  });

  return NextResponse.json({ ok: true });
}
