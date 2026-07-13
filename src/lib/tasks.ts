import type {
  Role,
  TaskDepartment,
  TaskFrequency,
  TaskPriority,
  TaskStatus,
} from "@prisma/client";
export { TASK_FREQUENCY_LABELS } from "@/lib/task-schedule";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { SCALE } from "@/lib/scale";
import { hasMinimumRole } from "@/lib/permissions";
import { isTaskActiveStatus } from "@/lib/task-due-urgency";
import { buildTaskVisibilityWhere } from "@/lib/task-verification";

export const ACTIVE_TASK_STATUSES: TaskStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "AWAITING_VERIFICATION",
  "REVISION_REQUESTED",
  "EXTENSION_REQUESTED",
  "HELP_REQUESTED",
];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  AWAITING_VERIFICATION: "Awaiting verification",
  COMPLETED: "Completed",
  REVISION_REQUESTED: "Revision requested",
  EXTENSION_REQUESTED: "Extension requested",
  HELP_REQUESTED: "Help requested",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const TASK_DEPARTMENT_LABELS: Record<TaskDepartment, string> = {
  OPERATIONS: "Operations",
  SALES: "Sales",
  ACCOUNTS: "Accounts",
  ADMIN: "Admin",
  GENERAL: "General",
};

export function taskVisibilityFilter(user: SessionUser) {
  if (hasMinimumRole(user.role, "MANAGER")) {
    return { organizationId: user.organizationId };
  }
  return {
    organizationId: user.organizationId,
    assigneeUserId: user.id,
  };
}

/** Managers+ may filter by assignee; staff/viewers always see only their own tasks. */
export function taskAssigneeListFilter(
  user: SessionUser,
  assigneeUserId?: string,
) {
  if (!assigneeUserId || !hasMinimumRole(user.role, "MANAGER")) {
    return {};
  }
  return { assigneeUserId };
}

export async function listDelegatedTasks(
  user: SessionUser,
  filter?: {
    status?: import("@prisma/client").TaskStatus;
    assigneeUserId?: string;
    overdueOnly?: boolean;
    completedTodayOnly?: boolean;
    includeCompleted?: boolean;
  },
  pagination?: {
    page?: number;
    pageSize?: number;
  },
) {
  const pageSize = pagination?.pageSize ?? SCALE.TASK_PAGE_SIZE;
  const page = Math.max(1, pagination?.page ?? 1);
  const skip = (page - 1) * pageSize;

  const visibility = await buildTaskVisibilityWhere(user);

  const where = {
    ...visibility,
    ...(filter?.completedTodayOnly
      ? {
          status: "COMPLETED" as TaskStatus,
          completedAt: { gte: startOfToday() },
        }
      : filter?.overdueOnly
        ? {
            status: { in: ACTIVE_TASK_STATUSES },
            dueAt: { lt: new Date() },
          }
        : filter?.status
          ? { status: filter.status }
          : filter?.includeCompleted
            ? {}
            : { status: { in: ACTIVE_TASK_STATUSES } }),
    ...taskAssigneeListFilter(user, filter?.assigneeUserId),
  };

  const [items, total] = await Promise.all([
    prisma.delegatedTask.findMany({
      where,
      include: {
        assignee: {
          select: { id: true, name: true, email: true, phone: true },
        },
        createdBy: { select: { id: true, name: true, email: true } },
        attachments: {
          select: {
            id: true,
            fileName: true,
            mimeType: true,
            fileSize: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        requests: {
          where: { status: "OPEN" },
          include: {
            requestedBy: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.delegatedTask.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getTaskStats(user: SessionUser) {
  const where = await buildTaskVisibilityWhere(user);
  const [pending, inProgress, completedToday, overdue] = await Promise.all([
    prisma.delegatedTask.count({
      where: { ...where, status: "PENDING" },
    }),
    prisma.delegatedTask.count({
      where: { ...where, status: "IN_PROGRESS" },
    }),
    prisma.delegatedTask.count({
      where: {
        ...where,
        status: "COMPLETED",
        completedAt: { gte: startOfToday() },
      },
    }),
    prisma.delegatedTask.count({
      where: {
        ...where,
        status: { in: ACTIVE_TASK_STATUSES },
        dueAt: { lt: new Date() },
      },
    }),
  ]);

  return { pending, inProgress, completedToday, overdue };
}

export type TaskAssigneeWorkloadRow = {
  userId: string;
  name: string;
  pending: number;
  inProgress: number;
  overdue: number;
  completed: number;
  total: number;
};

export async function getTaskAssigneeWorkload(
  user: SessionUser,
): Promise<TaskAssigneeWorkloadRow[]> {
  const where = await buildTaskVisibilityWhere(user);
  const now = new Date();

  const [tasks, members] = await Promise.all([
    prisma.delegatedTask.findMany({
      where,
      select: {
        assigneeUserId: true,
        status: true,
        dueAt: true,
      },
    }),
    listAssignableMembers(user.organizationId),
  ]);

  const byUser = new Map<
    string,
    { pending: number; inProgress: number; overdue: number; completed: number }
  >();

  function ensure(userId: string) {
    if (!byUser.has(userId)) {
      byUser.set(userId, {
        pending: 0,
        inProgress: 0,
        overdue: 0,
        completed: 0,
      });
    }
    return byUser.get(userId)!;
  }

  for (const member of members) {
    ensure(member.id);
  }

  for (const task of tasks) {
    const bucket = ensure(task.assigneeUserId);
    if (task.status === "PENDING") {
      bucket.pending += 1;
    } else if (task.status === "IN_PROGRESS") {
      bucket.inProgress += 1;
    } else if (task.status === "AWAITING_VERIFICATION") {
      bucket.inProgress += 1;
    } else if (task.status === "COMPLETED") {
      bucket.completed += 1;
    }

    if (
      isTaskActiveStatus(task.status) &&
      task.dueAt.getTime() < now.getTime()
    ) {
      bucket.overdue += 1;
    }
  }

  const nameById = new Map(
    members.map((member) => [
      member.id,
      member.name ?? member.email.split("@")[0],
    ]),
  );

  return [...byUser.entries()]
    .map(([userId, counts]) => ({
      userId,
      name: nameById.get(userId) ?? "Team member",
      ...counts,
      total: counts.pending + counts.inProgress + counts.overdue,
    }))
    .filter((row) => row.total > 0 || row.completed > 0)
    .sort((a, b) => b.overdue - a.overdue || b.total - a.total);
}

export type TaskChartData = {
  statusBreakdown: Array<{ name: string; value: number; color: string }>;
  departmentBreakdown: Array<{ name: string; value: number }>;
  weeklyCompleted: Array<{ label: string; completed: number }>;
};

const TASK_STATUS_CHART_COLORS: Record<TaskStatus, string> = {
  PENDING: "#f97316",
  IN_PROGRESS: "#2563eb",
  AWAITING_VERIFICATION: "#0d9488",
  COMPLETED: "#16a34a",
  REVISION_REQUESTED: "#7c3aed",
  EXTENSION_REQUESTED: "#9333ea",
  HELP_REQUESTED: "#c026d3",
};

export async function getTaskChartData(user: SessionUser): Promise<TaskChartData> {
  const where = await buildTaskVisibilityWhere(user);

  const [statusGroups, departmentGroups, recentCompleted] = await Promise.all([
    prisma.delegatedTask.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
    prisma.delegatedTask.groupBy({
      by: ["department"],
      where,
      _count: { _all: true },
    }),
    prisma.delegatedTask.findMany({
      where: {
        ...where,
        status: "COMPLETED",
        completedAt: { gte: startOfDaysAgo(6) },
      },
      select: { completedAt: true },
    }),
  ]);

  const statusBreakdown = statusGroups
    .map((row) => ({
      name: TASK_STATUS_LABELS[row.status],
      value: row._count._all,
      color: TASK_STATUS_CHART_COLORS[row.status],
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);

  const departmentBreakdown = departmentGroups
    .map((row) => ({
      name: TASK_DEPARTMENT_LABELS[row.department],
      value: row._count._all,
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);

  const weeklyCompleted = buildWeeklyCompletedSeries(recentCompleted);

  return { statusBreakdown, departmentBreakdown, weeklyCompleted };
}

const TRACKER_DISTRIBUTION_COLORS = {
  overdue: "#dc2626",
  today: "#f59e0b",
  open: "#2563eb",
  closed: "#16a34a",
} as const;

export type TaskTrackerDashboardData = {
  distribution: Array<{ name: string; value: number; color: string }>;
  distributionTotal: number;
  performanceSeries: Array<{ label: string; completed: number }>;
  periodScores: {
    today: { value: number; trend: number };
    week: { value: number; trend: number };
    month: { value: number; trend: number };
  };
  dueToday: { total: number; completed: number };
  dailyYield: { completed: number; target: number };
  teamInsights: {
    onTrack: Array<{ name: string; userId: string }>;
    overdue: Array<{ name: string; userId: string }>;
    idle: Array<{ name: string; userId: string }>;
  };
  approvals: { verification: number; requests: number };
  summaryRows: Array<{
    label: string;
    href: string;
    overdue: number;
    today: number;
    open: number;
  }>;
};

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfPreviousWeek() {
  const d = startOfWeek();
  d.setDate(d.getDate() - 7);
  return d;
}

function startOfPreviousMonth() {
  const d = startOfMonth();
  d.setMonth(d.getMonth() - 1);
  return d;
}

type TrackerTaskRow = {
  status: TaskStatus;
  dueAt: Date;
  assigneeUserId: string;
  completedAt: Date | null;
};

function classifyTrackerBucket(
  task: TrackerTaskRow,
  now: Date,
  todayStart: Date,
  todayEnd: Date,
): "overdue" | "today" | "open" | "closed" {
  if (task.status === "COMPLETED") {
    return "closed";
  }
  if (!isTaskActiveStatus(task.status)) {
    return "open";
  }
  if (task.dueAt.getTime() < now.getTime()) {
    return "overdue";
  }
  if (
    task.dueAt.getTime() >= todayStart.getTime() &&
    task.dueAt.getTime() <= todayEnd.getTime()
  ) {
    return "today";
  }
  return "open";
}

function countTrackerBuckets(
  tasks: TrackerTaskRow[],
  now: Date,
  todayStart: Date,
  todayEnd: Date,
  filter?: (task: TrackerTaskRow) => boolean,
) {
  const counts = { overdue: 0, today: 0, open: 0, closed: 0 };
  for (const task of tasks) {
    if (filter && !filter(task)) {
      continue;
    }
    counts[classifyTrackerBucket(task, now, todayStart, todayEnd)] += 1;
  }
  return counts;
}

export async function getTaskTrackerDashboardData(
  user: SessionUser,
): Promise<TaskTrackerDashboardData> {
  const where = await buildTaskVisibilityWhere(user);
  const now = new Date();
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const weekStart = startOfWeek();
  const monthStart = startOfMonth();
  const prevWeekStart = startOfPreviousWeek();
  const prevMonthStart = startOfPreviousMonth();
  const yesterdayStart = startOfDaysAgo(1);

  const [
    tasks,
    chartData,
    assigneeWorkload,
    members,
    verificationCount,
    openRequestCount,
    completedToday,
    completedYesterday,
    completedThisWeek,
    completedPrevWeek,
    completedThisMonth,
    completedPrevMonth,
    dueTodayActive,
    dueTodayCompleted,
  ] = await Promise.all([
    prisma.delegatedTask.findMany({
      where,
      select: {
        status: true,
        dueAt: true,
        assigneeUserId: true,
        completedAt: true,
      },
    }),
    getTaskChartData(user),
    getTaskAssigneeWorkload(user),
    listAssignableMembers(user.organizationId),
    prisma.delegatedTask.count({
      where: { ...where, status: "AWAITING_VERIFICATION" },
    }),
    prisma.taskRequest.count({
      where: {
        organizationId: user.organizationId,
        status: "OPEN",
        task: where,
      },
    }),
    prisma.delegatedTask.count({
      where: {
        ...where,
        status: "COMPLETED",
        completedAt: { gte: todayStart },
      },
    }),
    prisma.delegatedTask.count({
      where: {
        ...where,
        status: "COMPLETED",
        completedAt: { gte: yesterdayStart, lt: todayStart },
      },
    }),
    prisma.delegatedTask.count({
      where: {
        ...where,
        status: "COMPLETED",
        completedAt: { gte: weekStart },
      },
    }),
    prisma.delegatedTask.count({
      where: {
        ...where,
        status: "COMPLETED",
        completedAt: { gte: prevWeekStart, lt: weekStart },
      },
    }),
    prisma.delegatedTask.count({
      where: {
        ...where,
        status: "COMPLETED",
        completedAt: { gte: monthStart },
      },
    }),
    prisma.delegatedTask.count({
      where: {
        ...where,
        status: "COMPLETED",
        completedAt: { gte: prevMonthStart, lt: monthStart },
      },
    }),
    prisma.delegatedTask.count({
      where: {
        ...where,
        status: { in: ACTIVE_TASK_STATUSES },
        dueAt: { gte: todayStart, lte: todayEnd },
      },
    }),
    prisma.delegatedTask.count({
      where: {
        ...where,
        status: "COMPLETED",
        completedAt: { gte: todayStart },
        dueAt: { gte: todayStart, lte: todayEnd },
      },
    }),
  ]);

  const distributionCounts = countTrackerBuckets(
    tasks,
    now,
    todayStart,
    todayEnd,
  );
  const distribution = [
    { name: "Overdue", value: distributionCounts.overdue, color: TRACKER_DISTRIBUTION_COLORS.overdue },
    { name: "Today", value: distributionCounts.today, color: TRACKER_DISTRIBUTION_COLORS.today },
    { name: "Open", value: distributionCounts.open, color: TRACKER_DISTRIBUTION_COLORS.open },
    { name: "Closed", value: distributionCounts.closed, color: TRACKER_DISTRIBUTION_COLORS.closed },
  ].filter((row) => row.value > 0);

  const distributionTotal =
    distributionCounts.overdue +
    distributionCounts.today +
    distributionCounts.open +
    distributionCounts.closed;

  const weeklyAvg =
    chartData.weeklyCompleted.reduce((sum, row) => sum + row.completed, 0) /
    Math.max(chartData.weeklyCompleted.length, 1);
  const dailyTarget = Math.max(3, Math.round(weeklyAvg * 1.15));

  const onTrack = assigneeWorkload
    .filter((row) => row.overdue === 0 && row.total > 0)
    .slice(0, 6)
    .map((row) => ({ name: row.name, userId: row.userId }));
  const overdueMembers = assigneeWorkload
    .filter((row) => row.overdue > 0)
    .slice(0, 6)
    .map((row) => ({ name: row.name, userId: row.userId }));
  const activeMemberIds = new Set(
    assigneeWorkload.filter((row) => row.total > 0).map((row) => row.userId),
  );
  const idle = members
    .filter((member) => !activeMemberIds.has(member.id))
    .slice(0, 6)
    .map((member) => ({ name: member.name, userId: member.id }));

  const summaryRows = [
    {
      label: "My tasks",
      href: "/app/tasks/today",
      ...countTrackerBuckets(
        tasks,
        now,
        todayStart,
        todayEnd,
        (task) => task.assigneeUserId === user.id,
      ),
    },
    {
      label: "Team board",
      href: "/app/tasks",
      ...countTrackerBuckets(tasks, now, todayStart, todayEnd),
    },
    {
      label: "Pending tasks",
      href: "/app/tasks?status=PENDING#execution-queue",
      ...countTrackerBuckets(
        tasks,
        now,
        todayStart,
        todayEnd,
        (task) => task.status === "PENDING",
      ),
    },
    {
      label: "Verification queue",
      href: "/app/tasks?status=AWAITING_VERIFICATION#execution-queue",
      ...countTrackerBuckets(
        tasks,
        now,
        todayStart,
        todayEnd,
        (task) => task.status === "AWAITING_VERIFICATION",
      ),
    },
  ].map((row) => ({
    label: row.label,
    href: row.href,
    overdue: row.overdue,
    today: row.today,
    open: row.open,
  }));

  return {
    distribution,
    distributionTotal,
    performanceSeries: chartData.weeklyCompleted,
    periodScores: {
      today: { value: completedToday, trend: completedToday - completedYesterday },
      week: { value: completedThisWeek, trend: completedThisWeek - completedPrevWeek },
      month: { value: completedThisMonth, trend: completedThisMonth - completedPrevMonth },
    },
    dueToday: {
      total: dueTodayActive + dueTodayCompleted,
      completed: dueTodayCompleted,
    },
    dailyYield: { completed: completedToday, target: dailyTarget },
    teamInsights: { onTrack, overdue: overdueMembers, idle },
    approvals: { verification: verificationCount, requests: openRequestCount },
    summaryRows,
  };
}

function startOfDaysAgo(days: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

function buildWeeklyCompletedSeries(
  tasks: Array<{ completedAt: Date | null }>,
) {
  const buckets = new Map<string, number>();
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    buckets.set(day.toDateString(), 0);
  }

  for (const task of tasks) {
    if (!task.completedAt) {
      continue;
    }
    const key = new Date(task.completedAt).toDateString();
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  return [...buckets.entries()].map(([dateKey, completed]) => ({
    label: new Date(dateKey).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
    }),
    completed,
  }));
}

export async function listTasksForExport(user: SessionUser) {
  const where = await buildTaskVisibilityWhere(user);
  return prisma.delegatedTask.findMany({
    where,
    include: {
      assignee: { select: { name: true, email: true } },
      createdBy: { select: { name: true, email: true } },
    },
    orderBy: [{ dueAt: "desc" }, { createdAt: "desc" }],
    take: 5000,
  });
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function listAssignableMembers(organizationId: string) {
  const memberships = await prisma.membership.findMany({
    where: {
      organizationId,
      role: { in: ["STAFF", "MANAGER", "ADMIN", "OWNER"] },
    },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return memberships.map((m) => ({
    id: m.user.id,
    name: m.user.name ?? m.user.email.split("@")[0],
    email: m.user.email,
    phone: m.user.phone,
    role: m.role,
    department: m.department,
    designation: m.designation,
  }));
}

export function isTaskOverdue(dueAt: Date, status: TaskStatus) {
  if (status === "COMPLETED") {
    return false;
  }
  if (!isTaskActiveStatus(status)) {
    return false;
  }
  return dueAt.getTime() < Date.now();
}

/** WhatsApp + reminders: AI instructions, or title when instructions are empty. */
export function resolveTaskDescription(
  title: string,
  instructions?: string | null,
) {
  const detail = instructions?.trim();
  if (detail) {
    return detail;
  }
  return title.trim();
}

export function formatTaskDue(dueAt: Date) {
  const now = new Date();
  const isToday = dueAt.toDateString() === now.toDateString();
  const time = dueAt.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  if (isToday) {
    return `Today, ${time}`;
  }
  return dueAt.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatTaskAssignedDate(createdAt: Date) {
  const now = new Date();
  const isToday = createdAt.toDateString() === now.toDateString();
  const time = createdAt.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  if (isToday) {
    return `Today, ${time}`;
  }
  return createdAt.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: createdAt.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatTaskDueLabel(dueAt: Date, status: TaskStatus) {
  if (status === "COMPLETED") {
    return formatTaskDue(dueAt);
  }

  const overdue = isTaskOverdue(dueAt, status);
  const ms = dueAt.getTime() - Date.now();
  const dayMs = 86_400_000;
  const days = Math.floor(ms / dayMs);

  if (overdue) {
    const overdueDays = Math.abs(days);
    if (overdueDays <= 0) {
      return "Overdue today";
    }
    return overdueDays === 1 ? "Overdue 1 day" : `Overdue ${overdueDays} days`;
  }

  if (days <= 0) {
    return formatTaskDue(dueAt);
  }
  if (days === 1) {
    const time = dueAt.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `Due tomorrow, ${time}`;
  }

  return `Due ${formatTaskDue(dueAt)}`;
}

export function assigneeInitials(name: string | null, email: string) {
  const source = name?.trim() || email.split("@")[0];
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function canCreateTasks(role: Role) {
  return hasMinimumRole(role, "MANAGER");
}

export function canDeleteTasks(role: Role) {
  return hasMinimumRole(role, "MANAGER");
}

export function canEditTasks(role: Role) {
  return hasMinimumRole(role, "MANAGER");
}

export function canUpdateTask(
  user: SessionUser,
  task: { assigneeUserId: string },
) {
  if (hasMinimumRole(user.role, "MANAGER")) {
    return true;
  }
  return isTaskAssignee(user, task);
}

export function canManageTaskRequests(role: Role) {
  return hasMinimumRole(role, "MANAGER");
}

export function isTaskAssignee(
  user: SessionUser,
  task: { assigneeUserId: string },
) {
  return task.assigneeUserId === user.id;
}
