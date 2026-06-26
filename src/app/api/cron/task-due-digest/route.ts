import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendTaskDueDigestEmail } from "@/lib/checklists/notifications";
import { ACTIVE_TASK_STATUSES } from "@/lib/tasks";
import { formatTaskDue } from "@/lib/tasks";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
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

  const todayStart = startOfToday();
  const memberships = await prisma.membership.findMany({
    where: {
      user: { email: { not: "" } },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      organization: { select: { id: true, name: true } },
    },
    take: 500,
  });

  let sent = 0;
  let skipped = 0;

  for (const membership of memberships) {
    if (
      membership.lastTaskDigestAt &&
      membership.lastTaskDigestAt >= todayStart
    ) {
      skipped += 1;
      continue;
    }

    const tasks = await prisma.delegatedTask.findMany({
      where: {
        organizationId: membership.organizationId,
        assigneeUserId: membership.userId,
        status: { in: ACTIVE_TASK_STATUSES },
      },
      orderBy: { dueAt: "asc" },
      take: 25,
    });

    if (tasks.length === 0) {
      continue;
    }

    const assigneeName =
      membership.user.name ?? membership.user.email.split("@")[0];
    const lines = tasks.map((task, index) => {
      const overdue = task.dueAt.getTime() < Date.now();
      return `${index + 1}. ${task.title} - due ${formatTaskDue(task.dueAt)}${overdue ? " (OVERDUE)" : ""} - ${task.status.replaceAll("_", " ")}`;
    });

    const email = await sendTaskDueDigestEmail({
      toEmail: membership.user.email,
      assigneeName,
      organizationName: membership.organization.name,
      lines,
    });

    if (email.sent) {
      sent += 1;
      await prisma.membership.update({
        where: { id: membership.id },
        data: { lastTaskDigestAt: new Date() },
      });
    }
  }

  return NextResponse.json({ sent, skipped, memberships: memberships.length });
}
