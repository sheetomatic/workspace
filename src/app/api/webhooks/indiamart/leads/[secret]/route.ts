import { after } from "next/server";
import { NextResponse } from "next/server";
import { processIndiaMartLeadPush } from "@/lib/leads/indiamart";

export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ secret: string }>;
};

export async function GET() {
  return NextResponse.json({ ok: true, listener: "indiamart-leads" });
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
      await processIndiaMartLeadPush({
        webhookSecret: secret,
        payload,
      });
    } catch (error) {
      console.error("indiamart leads webhook", error);
    }
  });

  return NextResponse.json({ ok: true });
}
