import type { TaskStatus } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasMinimumRole } from "@/lib/permissions";

export async function buildTaskVerifierIndex(
  organizationId: string,
  assigneeUserIds: string[],
) {
  if (assigneeUserIds.length === 0) {
    return new Map<string, string | null>();
  }

  const memberships = await prisma.membership.findMany({
    where: {
      organizationId,
      userId: { in: assigneeUserIds },
    },
    select: {
      userId: true,
      reportingManager: { select: { userId: true } },
    },
  });

  return new Map(
    memberships.map((membership) => [
      membership.userId,
      membership.reportingManager?.userId ?? null,
    ]),
  );
}

export function resolveTaskVerifierUserId(
  assigneeUserId: string,
  createdById: string,
  verifierByAssignee: Map<string, string | null>,
) {
  return verifierByAssignee.get(assigneeUserId) ?? createdById;
}

export function canVerifyTask(
  user: SessionUser,
  task: {
    assigneeUserId: string;
    createdById: string;
    status: TaskStatus;
  },
  verifierByAssignee: Map<string, string | null>,
) {
  if (task.status !== "AWAITING_VERIFICATION") {
    return false;
  }
  if (hasMinimumRole(user.role, "MANAGER")) {
    return true;
  }
  const verifierId = resolveTaskVerifierUserId(
    task.assigneeUserId,
    task.createdById,
    verifierByAssignee,
  );
  return user.id === verifierId;
}

export async function buildTaskVisibilityWhere(user: SessionUser) {
  if (hasMinimumRole(user.role, "MANAGER") || user.role === "VIEWER") {
    return { organizationId: user.organizationId };
  }

  const directReports = await prisma.membership.findMany({
    where: {
      organizationId: user.organizationId,
      reportingManager: { userId: user.id },
    },
    select: { userId: true },
  });
  const reportIds = directReports.map((row) => row.userId);

  if (reportIds.length === 0) {
    return { organizationId: user.organizationId, assigneeUserId: user.id };
  }

  return {
    organizationId: user.organizationId,
    OR: [
      { assigneeUserId: user.id },
      {
        status: "AWAITING_VERIFICATION" as const,
        assigneeUserId: { in: reportIds },
      },
    ],
  };
}

export async function loadReportingManagerContact(
  organizationId: string,
  assigneeUserId: string,
  fallback: { email: string; name: string | null },
) {
  const membership = await prisma.membership.findFirst({
    where: { organizationId, userId: assigneeUserId },
    select: {
      reportingManager: {
        select: {
          user: { select: { email: true, name: true } },
        },
      },
    },
  });

  const manager = membership?.reportingManager?.user;
  if (manager?.email) {
    return manager;
  }
  return fallback;
}
