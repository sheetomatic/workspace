import { NextResponse } from "next/server";

/** Liveness probe for Docker / Hostinger Nginx / uptime monitors. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "sheetomatic",
    ts: new Date().toISOString(),
  });
}
