import type { FmsTemplate, FmsTemplateStep, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notifyFmsStepAssigned } from "@/lib/fms/notify-step-assigned";
import { computePlannedAt, computeDelayMinutes } from "@/lib/fms/sla";
import {
  parseHolidayDates,
  type FmsSlaConfig,
  type FmsWorkingDaysConfig,
} from "@/lib/fms/constants";

type StepWithConfig = FmsTemplateStep;

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
    const workingDays = workingDaysFromTemplate(stepState.instance.template);
    const plannedAt = computePlannedAt(
      nextStep.slaType,
      nextStep.slaConfig as FmsSlaConfig,
      now,
      workingDays,
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
      where: { id: stepState.instanceId },
      data: { status: "COMPLETED" },
    });
  }
}
