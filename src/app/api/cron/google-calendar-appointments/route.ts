import { NextResponse } from "next/server";
import { syncGoogleCalendarAppointments } from "@/lib/leads/google-calendar-appointments";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await syncGoogleCalendarAppointments(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Calendar sync failed." }, { status: 502 });
  }
}
