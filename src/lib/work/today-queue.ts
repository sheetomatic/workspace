import type { PcWorkItem } from "@/lib/checklists/pc-work";
import { isTaskDueToday } from "@/lib/task-due-urgency";

export type TodayUrgency = "overdue" | "today" | "soon" | "later";

export type TodayWorkItem = PcWorkItem & {
  urgency: TodayUrgency;
  /** Checklist occurrence id when kind is CHECKLIST. */
  occurrenceId?: string;
  sortAt: number;
};

const URGENCY_RANK: Record<TodayUrgency, number> = {
  overdue: 0,
  today: 1,
  soon: 2,
  later: 3,
};

function urgencyFromDue(plannedAt: Date, overdue: boolean): TodayUrgency {
  if (overdue) {
    return "overdue";
  }
  if (isTaskDueToday(plannedAt)) {
    return "today";
  }
  const daysUntil = Math.ceil((plannedAt.getTime() - Date.now()) / 86_400_000);
  if (daysUntil <= 2) {
    return "soon";
  }
  return "later";
}

export function checklistToTodayItem(
  occurrence: {
    id: string;
    plannedAt: Date;
    status: string;
    template: { title: string; team: string };
    assignee: { name: string | null; email: string };
  },
): TodayWorkItem {
  const overdue = occurrence.status === "OVERDUE";
  return {
    id: occurrence.id,
    occurrenceId: occurrence.id,
    kind: "CHECKLIST",
    title: occurrence.template.title,
    subtitle: occurrence.template.team,
    owner: occurrence.assignee.name ?? occurrence.assignee.email.split("@")[0] ?? "",
    ownerId: null,
    pcUserIds: [],
    eaUserId: null,
    dueLabel: "",
    status: occurrence.status,
    overdue,
    href: "/app/today",
    completable: true,
    urgency: urgencyFromDue(occurrence.plannedAt, overdue),
    sortAt: occurrence.plannedAt.getTime(),
  };
}

export function pcWorkToTodayItem(item: PcWorkItem, plannedAt?: Date): TodayWorkItem {
  const due = plannedAt ?? new Date();
  return {
    ...item,
    urgency: urgencyFromDue(due, item.overdue),
    sortAt: due.getTime(),
  };
}

export function mergeTodayQueue(items: TodayWorkItem[]): TodayWorkItem[] {
  return [...items].sort((a, b) => {
    const rank = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
    if (rank !== 0) {
      return rank;
    }
    return a.sortAt - b.sortAt;
  });
}

export function todayUrgencyLabel(urgency: TodayUrgency) {
  switch (urgency) {
    case "overdue":
      return "Needs attention";
    case "today":
      return "Due today";
    case "soon":
      return "Coming up";
    default:
      return "Scheduled";
  }
}

export function todayHeroMessage(stats: {
  total: number;
  overdue: number;
  dueToday: number;
  completedThisWeek: number;
}) {
  if (stats.total === 0) {
    if (stats.completedThisWeek > 0) {
      return `You cleared ${stats.completedThisWeek} item${
        stats.completedThisWeek === 1 ? "" : "s"
      } this week. Stay ahead - it saves rework later.`;
    }
    return "You are clear for now. We will surface the next due item when it matters.";
  }
  if (stats.overdue > 0) {
    return `${stats.overdue} overdue - knock these out first to protect your score and avoid follow-ups.`;
  }
  if (stats.dueToday > 0) {
    return `${stats.dueToday} due today. Finish these now and you are done for the day.`;
  }
  return `${stats.total} on your list. Work top to bottom - each tick saves a reminder and a chase.`;
}
