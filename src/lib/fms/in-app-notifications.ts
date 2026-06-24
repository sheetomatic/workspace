import { prisma } from "@/lib/db";

export async function createFmsStepAssignedNotification(params: {
  userId: string;
  organizationId: string;
  instanceId: string;
  referenceLabel: string;
  stepName: string;
}) {
  const href = `/app/fms/instances/${params.instanceId}?from=my-stops&action=complete`;

  const existing = await prisma.userAppNotification.findFirst({
    where: {
      userId: params.userId,
      organizationId: params.organizationId,
      kind: "FMS_STEP_ASSIGNED",
      href,
      readAt: null,
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    return existing;
  }

  return prisma.userAppNotification.create({
    data: {
      userId: params.userId,
      organizationId: params.organizationId,
      kind: "FMS_STEP_ASSIGNED",
      title: "FMS step assigned",
      body: `${params.stepName} - ${params.referenceLabel}`,
      href,
    },
  });
}

export async function listUnreadAppNotifications(
  userId: string,
  organizationId: string,
  limit = 8,
) {
  return prisma.userAppNotification.findMany({
    where: { userId, organizationId, readAt: null },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function countUnreadAppNotifications(
  userId: string,
  organizationId: string,
) {
  return prisma.userAppNotification.count({
    where: { userId, organizationId, readAt: null },
  });
}

export async function markAppNotificationRead(
  notificationId: string,
  userId: string,
) {
  const row = await prisma.userAppNotification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!row || row.readAt) {
    return false;
  }
  await prisma.userAppNotification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
  return true;
}
