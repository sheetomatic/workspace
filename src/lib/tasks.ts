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

export const ACTIVE_TASK_STATUSES: TaskStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "REVISION_REQUESTED",
  "EXTENSION_REQUESTED",
  "HELP_REQUESTED",
];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
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
  if (hasMinimumRole(user.role, "MANAGER") || user.role === "VIEWER") {
    return { organizationId: user.organizationId };
  }
  return {
    organizationId: user.organizationId,
    assigneeUserId: user.id,
  };
}

/** Managers+ may filter by assignee; staff always see only their own tasks. */
export function taskAssigneeListFilter(
  user: SessionUser,
  assigneeUserId?: string,
) {
  if (
    !assigneeUserId ||
    (!hasMinimumRole(user.role, "MANAGER") && user.role !== "VIEWER")
  ) {
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

  const where = {
    ...taskVisibilityFilter(user),
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
  const where = taskVisibilityFilter(user);
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
  const where = taskVisibilityFilter(user);
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
  COMPLETED: "#16a34a",
  REVISION_REQUESTED: "#7c3aed",
  EXTENSION_REQUESTED: "#9333ea",
  HELP_REQUESTED: "#c026d3",
};

export async function getTaskChartData(user: SessionUser): Promise<TaskChartData> {
  const where = taskVisibilityFilter(user);

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
  return prisma.delegatedTask.findMany({
    where: taskVisibilityFilter(user),
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
