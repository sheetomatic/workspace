import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import type { FmsInstanceStatus, FmsStepStatus } from "@prisma/client";
import { SCALE } from "@/lib/scale";
import { isStepOverdue } from "@/lib/fms/step-display";
import { computeFmsPipelineCounts } from "@/lib/fms/pipeline-counts";
import { fmsJobMisScore } from "@/lib/mis/score";

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
  return listFmsInstancesPage(organizationId, { status: "ACTIVE" }).then(
    (page) => page.items,
  );
}

export async function listFmsInstancesPage(
  organizationId: string,
  filter?: {
    status?: FmsInstanceStatus | "ALL";
    page?: number;
    pageSize?: number;
    assigneeUserId?: string;
  },
) {
  const pageSize = filter?.pageSize ?? SCALE.FMS_PAGE_SIZE;
  const page = Math.max(1, filter?.page ?? 1);
  const skip = (page - 1) * pageSize;
  const status = filter?.status ?? "ACTIVE";

  const where = {
    organizationId,
    ...(status !== "ALL" ? { status } : {}),
    ...(filter?.assigneeUserId
      ? {
          stepStates: {
            some: {
              ownerUserId: filter.assigneeUserId,
              status: {
                in: ["IN_PROGRESS", "PENDING"] as FmsStepStatus[],
              },
            },
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.fmsInstance.findMany({
      where,
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
      skip,
      take: pageSize,
    }),
    prisma.fmsInstance.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getFmsOpsPage(
  organizationId: string,
  filter?: { overduePage?: number; unassignedPage?: number },
) {
  const pageSize = SCALE.FMS_PAGE_SIZE;
  const overduePage = Math.max(1, filter?.overduePage ?? 1);
  const unassignedPage = Math.max(1, filter?.unassignedPage ?? 1);
  const now = new Date();

  const overdueWhere = {
    status: "IN_PROGRESS" as const,
    plannedAt: { lt: now },
    instance: { organizationId, status: "ACTIVE" as const },
  };

  const unassignedWhere = {
    status: "IN_PROGRESS" as const,
    ownerUserId: null,
    instance: { organizationId, status: "ACTIVE" as const },
  };

  const [
    activeCount,
    overdueTotal,
    unassignedTotal,
    overdue,
    unassigned,
  ] = await Promise.all([
    prisma.fmsInstance.count({
      where: { organizationId, status: "ACTIVE" },
    }),
    prisma.fmsStepState.count({ where: overdueWhere }),
    prisma.fmsStepState.count({ where: unassignedWhere }),
    prisma.fmsStepState.findMany({
      where: overdueWhere,
      include: {
        step: true,
        instance: {
          include: { template: { select: { name: true } } },
        },
      },
      orderBy: { plannedAt: "asc" },
      skip: (overduePage - 1) * pageSize,
      take: pageSize,
    }),
    prisma.fmsStepState.findMany({
      where: unassignedWhere,
      include: {
        step: true,
        instance: {
          include: { template: { select: { name: true } } },
        },
      },
      orderBy: { instance: { updatedAt: "desc" } },
      skip: (unassignedPage - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    activeCount,
    overdueTotal,
    unassignedTotal,
    overduePage,
    unassignedPage,
    overduePageSize: pageSize,
    overdueTotalPages: Math.max(1, Math.ceil(overdueTotal / pageSize)),
    unassignedTotalPages: Math.max(1, Math.ceil(unassignedTotal / pageSize)),
    overdue,
    unassigned,
  };
}

/** @deprecated Use getFmsOpsPage */
export async function getFmsOpsSummary(organizationId: string) {
  const page = await getFmsOpsPage(organizationId);
  return {
    activeCount: page.activeCount,
    overdue: page.overdue,
    unassigned: page.unassigned,
  };
}

export async function getFmsMisSummary(organizationId: string) {
  const active = await prisma.fmsInstance.findMany({
    where: { organizationId, status: "ACTIVE" },
    include: {
      stepStates: { include: { step: true } },
      template: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (active.length === 0) {
    return {
      avgScore: 100,
      lineCount: 0,
      overdueCount: 0,
      lines: [] as Array<{
        id: string;
        label: string;
        score: number;
        currentStep: string;
      }>,
    };
  }

  const lines = active.map((job) => {
    const current = job.stepStates.find((s) => s.status === "IN_PROGRESS");
    return {
      id: job.id,
      label: job.referenceLabel ?? job.template.name,
      score: fmsJobMisScore(job.stepStates).score,
      currentStep: current?.step.stepName ?? "Waiting",
    };
  });

  const overdueCount = active.filter((job) => {
    const current = job.stepStates.find((s) => s.status === "IN_PROGRESS");
    if (!current) {
      return false;
    }
    return isStepOverdue(
      current.status,
      current.plannedAt,
      current.actualAt,
      current.delayMinutes,
    );
  }).length;

  const avgScore = Math.round(
    lines.reduce((sum, line) => sum + line.score, 0) / lines.length,
  );

  return { avgScore, lineCount: active.length, overdueCount, lines };
}

export async function getFmsPipelineCounts(organizationId: string) {
  const active = await prisma.fmsInstance.findMany({
    where: { organizationId, status: "ACTIVE" },
    select: {
      stepStates: {
        select: {
          status: true,
          plannedAt: true,
          actualAt: true,
          delayMinutes: true,
        },
      },
    },
  });

  return computeFmsPipelineCounts(active);
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

export async function listFmsFlowDesigns(organizationId: string) {
  return prisma.fmsFlowDesign.findMany({
    where: { organizationId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
      form: { select: { id: true, name: true, status: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getFmsFlowDesign(designId: string, organizationId: string) {
  return prisma.fmsFlowDesign.findFirst({
    where: { id: designId, organizationId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
      form: {
        select: {
          id: true,
          name: true,
          status: true,
          _count: { select: { fields: true } },
          template: { select: { id: true, status: true } },
        },
      },
    },
  });
}

export async function listPendingFmsFlowDesigns(organizationId: string) {
  return prisma.fmsFlowDesign.findMany({
    where: { organizationId, status: "PENDING_APPROVAL" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { submittedAt: "asc" },
  });
}

export async function getFmsOnboardingStatus(organizationId: string) {
  const [designCount, approvedDesign, activeForm, instanceCount, assignedStep] =
    await Promise.all([
      prisma.fmsFlowDesign.count({ where: { organizationId } }),
      prisma.fmsFlowDesign.findFirst({
        where: { organizationId, status: "APPROVED" },
        select: { id: true },
      }),
      prisma.fmsForm.findFirst({
        where: { organizationId, status: "ACTIVE" },
        select: { id: true },
      }),
      prisma.fmsInstance.count({ where: { organizationId } }),
      prisma.fmsStepState.findFirst({
        where: {
          instance: { organizationId },
          ownerUserId: { not: null },
        },
        select: { id: true },
      }),
    ]);

  return {
    hasDesign: designCount > 0,
    hasApprovedDesign: Boolean(approvedDesign),
    hasLiveForm: Boolean(activeForm),
    hasSubmission: instanceCount > 0,
    hasAssignedOwner: Boolean(assignedStep),
  };
}

export async function listFmsTrackerBlocks(
  organizationId: string,
  filter: { instanceStatus: "ACTIVE" | "COMPLETED"; limit?: number },
) {
  const limit = filter.limit ?? 50;

  return prisma.fmsTemplate.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      instances: { some: { status: filter.instanceStatus } },
    },
    include: {
      form: {
        select: {
          id: true,
          name: true,
          fields: { orderBy: { sortOrder: "asc" } },
        },
      },
      steps: {
        orderBy: { sortOrder: "asc" },
        include: {
          defaultOwner: { select: { name: true, email: true } },
        },
      },
      instances: {
        where: { status: filter.instanceStatus },
        include: {
          submission: true,
          stepStates: {
            orderBy: { step: { sortOrder: "asc" } },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      },
    },
    orderBy: { name: "asc" },
  });
}
