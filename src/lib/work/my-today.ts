import { prisma } from "@/lib/db";
import {
  checklistToTodayItem,
  mergeTodayQueue,
  pcWorkToTodayItem,
  type TodayWorkItem,
} from "@/lib/work/today-queue";
import { listMyPcWork } from "@/lib/checklists/pc-work";
import { checklistOccurrenceMisScore } from "@/lib/mis/score";

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export type MyTodayPayload = {
  items: TodayWorkItem[];
  stats: {
    total: number;
    overdue: number;
    dueToday: number;
    completedThisWeek: number;
    onTimeScore: number;
  };
};

export async function getMyTodayPayload(
  organizationId: string,
  userId: string,
): Promise<MyTodayPayload> {
  const weekStart = startOfWeek(new Date());

  const [work, completedChecklists, completedTasks] = await Promise.all([
    listMyPcWork(organizationId, userId),
    prisma.checklistOccurrence.count({
      where: {
        organizationId,
        assigneeUserId: userId,
        status: "DONE",
        actualAt: { gte: weekStart },
      },
    }),
    prisma.delegatedTask.count({
      where: {
        organizationId,
        assigneeUserId: userId,
        status: "COMPLETED",
        completedAt: { gte: weekStart },
      },
    }),
  ]);

  const checklistItems = work.checklists.map((row) => {
    const item = checklistToTodayItem(row);
    item.dueLabel = row.plannedAt.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    item.sortAt = row.plannedAt.getTime();
    return item;
  });

  const eaItems = work.eaTasks.map((task) =>
    pcWorkToTodayItem(task, task.dueAt ?? new Date()),
  );

  const fmsItems = work.fmsSteps.map((step) =>
    pcWorkToTodayItem(step, step.dueAt ?? new Date()),
  );

  const items = mergeTodayQueue([...checklistItems, ...eaItems, ...fmsItems]);

  const overdue = items.filter((item) => item.urgency === "overdue").length;
  const dueToday = items.filter((item) => item.urgency === "today").length;
  const completedThisWeek = completedChecklists + completedTasks;

  const recentDone = await prisma.checklistOccurrence.findMany({
    where: {
      organizationId,
      assigneeUserId: userId,
      status: "DONE",
      actualAt: { gte: weekStart },
    },
    select: { plannedAt: true, actualAt: true, status: true },
    take: 50,
  });

  const scores = recentDone.map((row) =>
    checklistOccurrenceMisScore({
      plannedAt: row.plannedAt,
      actualAt: row.actualAt,
      status: row.status,
    }).score,
  );
  const onTimeScore =
    scores.length > 0
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : 100;

  return {
    items,
    stats: {
      total: items.length,
      overdue,
      dueToday,
      completedThisWeek,
      onTimeScore,
    },
  };
}
