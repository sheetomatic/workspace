import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { syncCalendarBookings } from "@/lib/leads/google-calendar-bookings";
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET required" }, { status: 503 });
  const actual = Buffer.from(request.headers.get("authorization") ?? ""), expected = Buffer.from(`Bearer ${secret}`);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await syncCalendarBookings()); }
  catch { return NextResponse.json({ error: "Calendar sync failed; inspect the connection status" }, { status: 503 }); }
}
