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

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
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

export async function listDelegatedTasks(
  user: SessionUser,
  filter?: {
    status?: import("@prisma/client").TaskStatus;
    assigneeUserId?: string;
    overdueOnly?: boolean;
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
    ...(filter?.overdueOnly
      ? {
          status: { in: ["PENDING", "IN_PROGRESS"] as TaskStatus[] },
          dueAt: { lt: new Date() },
        }
      : filter?.status
        ? { status: filter.status }
        : filter?.includeCompleted
          ? {}
          : { status: { in: ["PENDING", "IN_PROGRESS"] as TaskStatus[] } }),
    ...(filter?.assigneeUserId ? { assigneeUserId: filter.assigneeUserId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.delegatedTask.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
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
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueAt: { lt: new Date() },
      },
    }),
  ]);

  return { pending, inProgress, completedToday, overdue };
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
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return memberships.map((m) => ({
    id: m.user.id,
    name: m.user.name ?? m.user.email.split("@")[0],
    email: m.user.email,
    role: m.role,
  }));
}

export function isTaskOverdue(dueAt: Date, status: TaskStatus) {
  if (status === "COMPLETED") {
    return false;
  }
  return dueAt.getTime() < Date.now();
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
  return task.assigneeUserId === user.id;
}
