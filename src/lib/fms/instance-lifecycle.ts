import type { FmsTemplate, FmsTemplateStep, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notifyFmsStepAssigned } from "@/lib/fms/notify-step-assigned";
import { computePlannedAt, computeDelayMinutes } from "@/lib/fms/sla";
import {
  parseAlertConfig,
  parseHolidayDates,
  type FmsSlaConfig,
  type FmsWorkingDaysConfig,
} from "@/lib/fms/constants";

type StepWithConfig = FmsTemplateStep;

type InstanceWithPipeline = {
  id: string;
  status: string;
  template: FmsTemplate & { steps: StepWithConfig[] };
  stepStates: Array<{
    id: string;
    stepId: string;
    ownerUserId: string | null;
    status: string;
  }>;
};

function workingDaysFromTemplate(template: FmsTemplate): FmsWorkingDaysConfig {
  return {
    skipSaturday: false,
    holidayDates: parseHolidayDates(template.holidayDates),
  };
}

export function buildReferenceLabel(
  values: Record<string, unknown>,
  fields: { fieldKey: string; label: string }[],
) {
  for (const field of fields) {
    const value = values[field.fieldKey];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim().slice(0, 120);
    }
  }
  return `Job ${new Date().toLocaleString("en-IN")}`;
}

async function planAllStepsFromAnchor(
  instance: InstanceWithPipeline,
  startIndex: number,
  anchor: Date,
) {
  const workingDays = workingDaysFromTemplate(instance.template);
  const steps = instance.template.steps;
  let cursor = anchor;
  const plannedByStateId = new Map<string, Date | null>();

  for (let index = startIndex; index < steps.length; index += 1) {
    const step = steps[index]!;
    const state = instance.stepStates.find((item) => item.stepId === step.id);
    if (!state || state.status !== "PENDING") {
      continue;
    }
    const plannedAt = computePlannedAt(
      step.slaType,
      step.slaConfig as FmsSlaConfig,
      cursor,
      workingDays,
    );
    if (plannedAt) {
      cursor = plannedAt;
    }
    plannedByStateId.set(state.id, plannedAt);
    await prisma.fmsStepState.update({
      where: { id: state.id },
      data: { plannedAt },
    });
  }

  return plannedByStateId;
}

async function advancePipelineAfterStep(params: {
  instance: InstanceWithPipeline;
  currentStepId: string;
  completedAt: Date;
}) {
  const { instance, currentStepId, completedAt } = params;
  const planMode = parseAlertConfig(instance.template.alertConfig).planMode;
  const currentIndex = instance.template.steps.findIndex(
    (s) => s.id === currentStepId,
  );
  const nextStep = instance.template.steps[currentIndex + 1];

  if (nextStep) {
    const workingDays = workingDaysFromTemplate(instance.template);
    const nextState = instance.stepStates.find((s) => s.stepId === nextStep.id);
    let plannedByStateId = new Map<string, Date | null>();

    if (planMode === "AUTO_TAT_ALL" && currentIndex === 0) {
      plannedByStateId = await planAllStepsFromAnchor(
        instance,
        currentIndex + 1,
        completedAt,
      );
    }

    let plannedAt: Date | null;
    if (planMode === "ON_PREV_ACTUAL") {
      plannedAt = computePlannedAt(
        nextStep.slaType,
        nextStep.slaConfig as FmsSlaConfig,
        completedAt,
        workingDays,
      );
    } else if (nextState) {
      const persisted = await prisma.fmsStepState.findUnique({
        where: { id: nextState.id },
        select: { plannedAt: true },
      });
      plannedAt =
        plannedByStateId.get(nextState.id) ??
        persisted?.plannedAt ??
        computePlannedAt(
          nextStep.slaType,
          nextStep.slaConfig as FmsSlaConfig,
          completedAt,
          workingDays,
        );
    } else {
      plannedAt = computePlannedAt(
        nextStep.slaType,
        nextStep.slaConfig as FmsSlaConfig,
        completedAt,
        workingDays,
      );
    }

    if (nextState) {
      await prisma.fmsStepState.update({
        where: { id: nextState.id },
        data: {
          status: "IN_PROGRESS",
          plannedAt,
          ownerUserId: nextState.ownerUserId ?? nextStep.defaultOwnerUserId,
          whatsappAssignSentAt: null,
          whatsappDueSoonSentAt: null,
          whatsappSameDaySentAt: null,
          whatsappOverdueSentAt: null,
        },
      });
      void notifyFmsStepAssigned(nextState.id);
    }
  } else {
    await prisma.fmsInstance.update({
      where: { id: instance.id },
      data: { status: "COMPLETED" },
    });
  }
}

async function loadInstancePipeline(stepStateId: string, organizationId: string) {
  return prisma.fmsStepState.findFirst({
    where: {
      id: stepStateId,
      instance: { organizationId, status: "ACTIVE" },
    },
    include: {
      step: true,
      instance: {
        include: {
          template: {
            include: { steps: { orderBy: { sortOrder: "asc" } } },
          },
          stepStates: { include: { step: true } },
        },
      },
    },
  });
}

export async function createFmsInstanceFromSubmission(params: {
  organizationId: string;
  template: FmsTemplate & { steps: StepWithConfig[] };
  submissionId: string;
  referenceLabel: string;
}) {
  const { organizationId, template, submissionId, referenceLabel } = params;
  const sortedSteps = [...template.steps].sort((a, b) => a.sortOrder - b.sortOrder);
  const startedAt = new Date();
  const workingDays = workingDaysFromTemplate(template);

  const instance = await prisma.fmsInstance.create({
    data: {
      organizationId,
      templateId: template.id,
      submissionId,
      referenceLabel,
      status: "ACTIVE",
      stepStates: {
        create: sortedSteps.map((step, index) => {
          const anchor = index === 0 ? startedAt : startedAt;
          const plannedAt =
            index === 0
              ? computePlannedAt(
                  step.slaType,
                  step.slaConfig as FmsSlaConfig,
                  anchor,
                  workingDays,
                )
              : null;

          return {
            stepId: step.id,
            ownerUserId: step.defaultOwnerUserId,
            plannedAt,
            status: index === 0 ? "IN_PROGRESS" : "PENDING",
          };
        }),
      },
    },
    include: {
      stepStates: { include: { step: true }, orderBy: { step: { sortOrder: "asc" } } },
    },
  });

  const firstInProgress = instance.stepStates.find(
    (s) => s.status === "IN_PROGRESS",
  );
  if (firstInProgress) {
    void notifyFmsStepAssigned(firstInProgress.id);
  }

  return instance;
}

export async function completeFmsStep(params: {
  stepStateId: string;
  organizationId: string;
  userId: string;
  notes?: string;
  completionValues?: Record<string, unknown>;
}) {
  const stepState = await loadInstancePipeline(
    params.stepStateId,
    params.organizationId,
  );

  if (!stepState) {
    throw new Error("Step not found");
  }

  if (stepState.status !== "IN_PROGRESS") {
    throw new Error("Only the active step can be completed.");
  }

  const now = new Date();
  const delayMinutes = computeDelayMinutes(stepState.plannedAt, now, now);

  await prisma.fmsStepState.update({
    where: { id: stepState.id },
    data: {
      status: "DONE",
      actualAt: now,
      delayMinutes,
      completedByUserId: params.userId,
      notes: params.notes?.trim() || null,
      completionValues: (params.completionValues ?? {}) as Prisma.InputJsonValue,
    },
  });

  await advancePipelineAfterStep({
    instance: stepState.instance,
    currentStepId: stepState.stepId,
    completedAt: now,
  });
}

export async function skipFmsStep(params: {
  stepStateId: string;
  organizationId: string;
  userId: string;
  reason?: string;
}) {
  const stepState = await loadInstancePipeline(
    params.stepStateId,
    params.organizationId,
  );

  if (!stepState) {
    throw new Error("Step not found");
  }

  if (stepState.status !== "IN_PROGRESS") {
    throw new Error("Only the active step can be skipped.");
  }

  const now = new Date();

  await prisma.fmsStepState.update({
    where: { id: stepState.id },
    data: {
      status: "SKIPPED",
      actualAt: now,
      delayMinutes: null,
      completedByUserId: params.userId,
      notes: params.reason?.trim() || "Skipped by manager",
    },
  });

  await advancePipelineAfterStep({
    instance: stepState.instance,
    currentStepId: stepState.stepId,
    completedAt: now,
  });
}

export async function cancelFmsInstance(params: {
  instanceId: string;
  organizationId: string;
  reason?: string;
}) {
  const instance = await prisma.fmsInstance.findFirst({
    where: {
      id: params.instanceId,
      organizationId: params.organizationId,
      status: "ACTIVE",
    },
  });

  if (!instance) {
    throw new Error("Active job not found");
  }

  await prisma.fmsInstance.update({
    where: { id: instance.id },
    data: { status: "CANCELLED" },
  });
}

export async function reassignFmsStepOwner(params: {
  stepStateId: string;
  organizationId: string;
  newOwnerUserId: string;
}) {
  const stepState = await prisma.fmsStepState.findFirst({
    where: {
      id: params.stepStateId,
      status: "IN_PROGRESS",
      instance: { organizationId: params.organizationId, status: "ACTIVE" },
    },
  });

  if (!stepState) {
    throw new Error("Active step not found");
  }

  const member = await prisma.membership.findFirst({
    where: {
      organizationId: params.organizationId,
      userId: params.newOwnerUserId,
    },
  });

  if (!member) {
    throw new Error("New owner must be a member of this workspace");
  }

  await prisma.fmsStepState.update({
    where: { id: stepState.id },
    data: {
      ownerUserId: params.newOwnerUserId,
      whatsappAssignSentAt: null,
      whatsappDueSoonSentAt: null,
      whatsappSameDaySentAt: null,
      whatsappOverdueSentAt: null,
    },
  });

  void notifyFmsStepAssigned(stepState.id);
}
