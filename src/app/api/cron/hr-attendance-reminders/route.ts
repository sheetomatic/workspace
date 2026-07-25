import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  runHrAttendanceReminders,
  type AttendanceReminderKind,
} from "@/lib/hr/attendance-automation";

const VALID_KINDS: AttendanceReminderKind[] = ["mark", "checkout", "summary"];

function parseKind(value: string | null): AttendanceReminderKind {
  return VALID_KINDS.includes(value as AttendanceReminderKind)
    ? (value as AttendanceReminderKind)
    : "mark";
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "production" && !cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET required" }, { status: 503 });
  }
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const kind = parseKind(new URL(request.url).searchParams.get("kind"));

  try {
    const result = await runHrAttendanceReminders(kind);
    await recordCronHeartbeat(
      `hr-attendance-reminders:${kind}`,
      `kind=${kind} orgs=${result.orgs} recipients=${result.recipients} sent=${result.sent}${result.skipped ? ` skipped=${result.skipped}` : ""}`,
      true,
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron failed";
    await recordCronHeartbeat(`hr-attendance-reminders:${kind}`, message, false);
    throw error;
  }
}

async function recordCronHeartbeat(jobKey: string, summary: string, ok: boolean) {
  await prisma.cronHeartbeat.upsert({
    where: { jobKey },
    create: { jobKey, lastRunAt: new Date(), lastOk: ok, summary },
    update: { lastRunAt: new Date(), lastOk: ok, summary },
  });
}
