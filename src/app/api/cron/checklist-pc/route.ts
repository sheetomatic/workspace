import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  generateChecklistOccurrences,
  listChecklistReminderCandidates,
  syncChecklistOccurrenceStatuses,
} from "@/lib/checklists/queries";
import { sendChecklistReminderEmail } from "@/lib/checklists/notifications";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "production" && !cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET required" }, { status: 503 });
  }

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncChecklistOccurrenceStatuses();
  const generated = await generateChecklistOccurrences();

  const candidates = await listChecklistReminderCandidates();
  let sent = 0;

  for (const row of candidates) {
    const assigneeName =
      row.assignee.name ?? row.assignee.email.split("@")[0];
    const plannedLabel = new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(row.plannedAt);

    const email = await sendChecklistReminderEmail({
      toEmail: row.assignee.email,
      assigneeName,
      organizationName: row.organization.name,
      title: row.template.title,
      team: row.template.team,
      plannedLabel,
      status: row.status,
    });

    if (email.sent) {
      sent += 1;
      await prisma.checklistOccurrence.update({
        where: { id: row.id },
        data: { emailReminderSentAt: new Date() },
      });
    }
  }

  return NextResponse.json({
    generated,
    reminders: { candidates: candidates.length, sent },
  });
}
