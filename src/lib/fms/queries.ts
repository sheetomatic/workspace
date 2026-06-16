import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";

export async function listFmsForms(organizationId: string) {
  return prisma.fmsForm.findMany({
    where: { organizationId },
    include: {
      fields: { orderBy: { sortOrder: "asc" } },
      template: { select: { id: true, name: true, status: true } },
      _count: { select: { submissions: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getFmsForm(formId: string, organizationId: string) {
  return prisma.fmsForm.findFirst({
    where: { id: formId, organizationId },
    include: {
      fields: { orderBy: { sortOrder: "asc" } },
      template: {
        include: { steps: { orderBy: { sortOrder: "asc" } } },
      },
      _count: { select: { submissions: true } },
    },
  });
}

export async function listFmsInstances(organizationId: string) {
  return prisma.fmsInstance.findMany({
    where: { organizationId },
    include: {
      template: {
        select: {
          name: true,
          form: { select: { id: true, name: true } },
        },
      },
      stepStates: {
        include: {
          step: true,
          owner: { select: { id: true, name: true, email: true } },
        },
        orderBy: { step: { sortOrder: "asc" } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function listMyFmsSteps(organizationId: string, userId: string) {
  return prisma.fmsStepState.findMany({
    where: {
      ownerUserId: userId,
      status: "IN_PROGRESS",
      instance: { organizationId, status: "ACTIVE" },
    },
    include: {
      step: true,
      instance: {
        include: {
          template: { select: { name: true } },
        },
      },
    },
    orderBy: { plannedAt: "asc" },
    take: 50,
  });
}

export async function getFmsInstance(instanceId: string, organizationId: string) {
  return prisma.fmsInstance.findFirst({
    where: { id: instanceId, organizationId },
    include: {
      template: {
        include: {
          form: { include: { fields: { orderBy: { sortOrder: "asc" } } } },
          steps: { orderBy: { sortOrder: "asc" } },
        },
      },
      submission: true,
      stepStates: {
        include: {
          step: true,
          owner: { select: { id: true, name: true, email: true } },
          completedBy: { select: { id: true, name: true } },
          attachments: {
            select: {
              id: true,
              fileName: true,
              mimeType: true,
              fileSize: true,
              createdAt: true,
            },
          },
        },
        orderBy: { step: { sortOrder: "asc" } },
      },
    },
  });
}

export function currentStepForUser(
  instance: Awaited<ReturnType<typeof getFmsInstance>>,
  user: SessionUser,
) {
  if (!instance) {
    return null;
  }
  return instance.stepStates.find(
    (s) =>
      s.status === "IN_PROGRESS" &&
      (s.ownerUserId === user.id || s.ownerUserId === null),
  );
}
