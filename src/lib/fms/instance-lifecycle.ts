import type { FmsTemplate, FmsTemplateStep, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { computePlannedAt, computeDelayMinutes } from "@/lib/fms/sla";
import type { FmsSlaConfig } from "@/lib/fms/constants";

type StepWithConfig = FmsTemplateStep;

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

export async function createFmsInstanceFromSubmission(params: {
  organizationId: string;
  template: FmsTemplate & { steps: StepWithConfig[] };
  submissionId: string;
  referenceLabel: string;
}) {
  const { organizationId, template, submissionId, referenceLabel } = params;
  const sortedSteps = [...template.steps].sort((a, b) => a.sortOrder - b.sortOrder);
  const startedAt = new Date();

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

  return instance;
}

export async function completeFmsStep(params: {
  stepStateId: string;
  organizationId: string;
  userId: string;
  notes?: string;
  completionValues?: Record<string, unknown>;
}) {
  const stepState = await prisma.fmsStepState.findFirst({
    where: {
      id: params.stepStateId,
      instance: { organizationId: params.organizationId },
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

  if (!stepState) {
    throw new Error("Step not found");
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

  const currentIndex = stepState.instance.template.steps.findIndex(
    (s) => s.id === stepState.stepId,
  );
  const nextStep = stepState.instance.template.steps[currentIndex + 1];

  if (nextStep) {
    const plannedAt = computePlannedAt(
      nextStep.slaType,
      nextStep.slaConfig as FmsSlaConfig,
      now,
    );
    const nextState = stepState.instance.stepStates.find(
      (s) => s.stepId === nextStep.id,
    );
    if (nextState) {
      await prisma.fmsStepState.update({
        where: { id: nextState.id },
        data: {
          status: "IN_PROGRESS",
          plannedAt,
          ownerUserId: nextState.ownerUserId ?? nextStep.defaultOwnerUserId,
        },
      });
    }
  } else {
    await prisma.fmsInstance.update({
      where: { id: stepState.instanceId },
      data: { status: "COMPLETED" },
    });
  }
}
