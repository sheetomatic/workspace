import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runCallbackAgent } from "@/lib/leads/callback-agent";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET required" }, { status: 503 });
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await runCallbackAgent());
  } catch {
    console.error("CRM callback agent failed; inspect task and activity state");
    return NextResponse.json({ error: "Callback processing failed" }, { status: 503 });
  }
}
