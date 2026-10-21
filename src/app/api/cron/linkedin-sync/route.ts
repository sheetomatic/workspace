import { NextResponse } from "next/server";
import { sameSecret } from "@/lib/leads/linkedin/security";
import { runLinkedInSyncQueue } from "@/lib/leads/linkedin/sync";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || !sameSecret(request.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runLinkedInSyncQueue(), { headers: { "Cache-Control": "no-store" } });
}
