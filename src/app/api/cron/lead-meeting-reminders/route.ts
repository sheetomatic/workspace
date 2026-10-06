import { NextResponse } from "next/server";
import { runDueMeetingReminders } from "@/lib/leads/meeting-reminders";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "production" && !cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET required" }, { status: 503 });
  }

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runDueMeetingReminders();
  return NextResponse.json({ ok: true, ...result });
}
