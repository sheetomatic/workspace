import { NextResponse } from "next/server";

/** Liveness for Railway / Docker healthchecks. No DB probe (stays fast). */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "sheetomatic",
    ts: new Date().toISOString(),
  });
}
