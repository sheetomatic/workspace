import type { FmsTemplate, FmsTemplateStep, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  handleFmsInstanceCompleted,
  handleFmsStepCompletedWithValues,
} from "@/lib/fms/handoff-engine";
import { notifyFmsStepAssigned } from "@/lib/fms/notify-step-assigned";
import { computePlannedAt, computeDelayMinutes } from "@/lib/fms/sla";
import {
  parseAlertConfig,
  parseHolidayDates,
  type FmsSlaConfig,
  type FmsWorkingDaysConfig,
} from "@/lib/fms/constants";
import {
  MAX_FMS_STEP_VISITS,
  firstMatchingRouteRule,
  nextVisitIndexForStep,
  parseRouteRules,
  planFmsAdvance,
  visitCountForStep,
  type FmsAdvancePlan,
} from "@/lib/fms/route-rules";

type StepWithConfig = FmsTemplateStep;

type PipelineStepState = {
  id: string;
  stepId: string;
  visitIndex: number;
  ownerUserId: string | null;
  status: string;
};

type InstanceWithPipeline = {
  id: string;
  status: string;
  submission: { values: Prisma.JsonValue } | null;
  template: FmsTemplate & { steps: StepWithConfig[] };
  stepStates: PipelineStepState[];
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

function jsonRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return raw as Record<string, unknown>;
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
    const state = instance.stepStates.find(
      (item) => item.stepId === step.id && item.status === "PENDING",
    );
    if (!state) {
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

function plannedAtForStep(params: {
  instance: InstanceWithPipeline;
  step: StepWithConfig;
  completedAt: Date;
  currentIndex: number;
  plannedByStateId: Map<string, Date | null>;
  existingStateId?: string;
}) {
  const workingDays = workingDaysFromTemplate(params.instance.template);
  const planMode = parseAlertConfig(params.instance.template.alertConfig).planMode;
  if (planMode === "ON_PREV_ACTUAL") {
    return computePlannedAt(
      params.step.slaType,
      params.step.slaConfig as FmsSlaConfig,
      params.completedAt,
      workingDays,
    );
  }
  if (params.existingStateId) {
    return (
      params.plannedByStateId.get(params.existingStateId) ??
      computePlannedAt(
        params.step.slaType,
        params.step.slaConfig as FmsSlaConfig,
        params.completedAt,
        workingDays,
      )
    );
  }
  return computePlannedAt(
    params.step.slaType,
    params.step.slaConfig as FmsSlaConfig,
    params.completedAt,
    workingDays,
  );
}

async function skipPendingSteps(params: {
  instance: InstanceWithPipeline;
  stepIds: string[];
  userId: string;
  at: Date;
  note: string;
}) {
  for (const stepId of params.stepIds) {
    const pending = params.instance.stepStates.find(
      (state) => state.stepId === stepId && state.status === "PENDING",
    );
    if (!pending) {
      continue;
    }
    await prisma.fmsStepState.update({
      where: { id: pending.id },
      data: {
        status: "SKIPPED",
        actualAt: params.at,
        delayMinutes: null,
        completedByUserId: params.userId,
        notes: params.note,
      },
    });
    pending.status = "SKIPPED";
  }
}

async function activateStep(params: {
  instance: InstanceWithPipeline;
  step: StepWithConfig;
  completedAt: Date;
  currentIndex: number;
  plannedByStateId: Map<string, Date | null>;
}) {
  const existingPending = params.instance.stepStates.find(
    (state) => state.stepId === params.step.id && state.status === "PENDING",
  );
  const visitCount = visitCountForStep(
    params.instance.stepStates,
    params.step.id,
  );

  if (!existingPending && visitCount >= MAX_FMS_STEP_VISITS) {
    throw new Error(
      `"${params.step.stepName}" already ran ${MAX_FMS_STEP_VISITS} times on this job. Ask a manager to skip or cancel.`,
    );
  }

  const computedPlanned = plannedAtForStep({
    instance: params.instance,
    step: params.step,
    completedAt: params.completedAt,
    currentIndex: params.currentIndex,
    plannedByStateId: params.plannedByStateId,
    existingStateId: existingPending?.id,
  });
  const planMode = parseAlertConfig(params.instance.template.alertConfig).planMode;

  if (existingPending) {
    const persisted = await prisma.fmsStepState.findUnique({
      where: { id: existingPending.id },
      select: { plannedAt: true },
    });
    const plannedAt =
      planMode === "ON_PREV_ACTUAL"
        ? computedPlanned
        : (params.plannedByStateId.get(existingPending.id) ??
          persisted?.plannedAt ??
          computedPlanned);
    await prisma.fmsStepState.update({
      where: { id: existingPending.id },
      data: {
        status: "IN_PROGRESS",
        plannedAt,
        ownerUserId: existingPending.ownerUserId ?? params.step.defaultOwnerUserId,
        whatsappAssignSentAt: null,
        whatsappDueSoonSentAt: null,
        whatsappSameDaySentAt: null,
        whatsappOverdueSentAt: null,
      },
    });
    void notifyFmsStepAssigned(existingPending.id);
    return;
  }

  const created = await prisma.fmsStepState.create({
    data: {
      instanceId: params.instance.id,
      stepId: params.step.id,
      visitIndex: nextVisitIndexForStep(
        params.instance.stepStates,
        params.step.id,
      ),
      status: "IN_PROGRESS",
      ownerUserId: params.step.defaultOwnerUserId,
      plannedAt: computedPlanned,
      whatsappAssignSentAt: null,
      whatsappDueSoonSentAt: null,
      whatsappSameDaySentAt: null,
      whatsappOverdueSentAt: null,
    },
  });
  void notifyFmsStepAssigned(created.id);
}

async function completeJob(params: {
  instance: InstanceWithPipeline;
  organizationId: string;
  completedByUserId: string;
}) {
  await prisma.fmsInstance.update({
    where: { id: params.instance.id },
    data: { status: "COMPLETED" },
  });
  await handleFmsInstanceCompleted(
    params.instance.id,
    params.organizationId,
    params.completedByUserId,
  );
}

async function applyAdvancePlan(params: {
  instance: InstanceWithPipeline;
  currentStepId: string;
  completedAt: Date;
  organizationId: string;
  completedByUserId: string;
  plan: FmsAdvancePlan;
}): Promise<boolean> {
  const { instance, currentStepId, completedAt } = params;
  const currentIndex = instance.template.steps.findIndex(
    (step) => step.id === currentStepId,
  );
  const planMode = parseAlertConfig(instance.template.alertConfig).planMode;
  let plannedByStateId = new Map<string, Date | null>();

  if (planMode === "AUTO_TAT_ALL" && currentIndex === 0) {
    plannedByStateId = await planAllStepsFromAnchor(
      instance,
      currentIndex + 1,
      completedAt,
    );
  }

  await skipPendingSteps({
    instance,
    stepIds: params.plan.skipStepIds,
    userId: params.completedByUserId,
    at: completedAt,
    note: "Skipped by workflow condition",
  });

  if (params.plan.kind === "complete_job") {
    await completeJob({
      instance,
      organizationId: params.organizationId,
      completedByUserId: params.completedByUserId,
    });
    return true;
  }

  const nextStepId = params.plan.stepId;
  const nextStep = instance.template.steps.find((step) => step.id === nextStepId);
  if (!nextStep) {
    await completeJob({
      instance,
      organizationId: params.organizationId,
      completedByUserId: params.completedByUserId,
    });
    return true;
  }

  await activateStep({
    instance,
    step: nextStep,
    completedAt,
    currentIndex,
    plannedByStateId,
  });
  return false;
}

function planForCompletedStep(params: {
  instance: InstanceWithPipeline;
  currentStepId: string;
  completionValues: Record<string, unknown>;
  useRouteRules: boolean;
}): FmsAdvancePlan {
  const current = params.instance.template.steps.find(
    (step) => step.id === params.currentStepId,
  );
  const rule = params.useRouteRules
    ? firstMatchingRouteRule(parseRouteRules(current?.routeRules), {
        completion: params.completionValues,
        intake: jsonRecord(params.instance.submission?.values),
      })
    : null;
  return planFmsAdvance({
    steps: params.instance.template.steps,
    currentStepId: params.currentStepId,
    rule,
  });
}

function assertCycleAllowed(
  instance: InstanceWithPipeline,
  plan: FmsAdvancePlan,
) {
  if (plan.kind !== "activate") {
    return;
  }
  const target = instance.template.steps.find((step) => step.id === plan.stepId);
  if (!target) {
    return;
  }
  const hasPending = instance.stepStates.some(
    (state) => state.stepId === target.id && state.status === "PENDING",
  );
  if (hasPending) {
    return;
  }
  if (visitCountForStep(instance.stepStates, target.id) >= MAX_FMS_STEP_VISITS) {
    throw new Error(
      `"${target.stepName}" already ran ${MAX_FMS_STEP_VISITS} times on this job. Ask a manager to skip or cancel.`,
    );
  }
}

export async function handleFmsStepHandoffAfterComplete(params: {
  instanceId: string;
  organizationId: string;
  completedByUserId: string;
  stepName: string;
  completionValues: Record<string, unknown>;
}) {
  await handleFmsStepCompletedWithValues(params);
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
          submission: { select: { values: true } },
          template: {
            include: { steps: { orderBy: { sortOrder: "asc" } } },
          },
          stepStates: { orderBy: { visitIndex: "asc" } },
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
          const plannedAt =
            index === 0
              ? computePlannedAt(
                  step.slaType,
                  step.slaConfig as FmsSlaConfig,
                  startedAt,
                  workingDays,
                )
              : null;

          return {
            stepId: step.id,
            visitIndex: 0,
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

  const completionValues = params.completionValues ?? {};
  const plan = planForCompletedStep({
    instance: stepState.instance,
    currentStepId: stepState.stepId,
    completionValues,
    useRouteRules: true,
  });
  assertCycleAllowed(stepState.instance, plan);

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
      completionValues: completionValues as Prisma.InputJsonValue,
    },
  });

  await applyAdvancePlan({
    instance: stepState.instance,
    currentStepId: stepState.stepId,
    completedAt: now,
    organizationId: params.organizationId,
    completedByUserId: params.userId,
    plan,
  });

  await handleFmsStepHandoffAfterComplete({
    instanceId: stepState.instance.id,
    organizationId: params.organizationId,
    completedByUserId: params.userId,
    stepName: stepState.step.stepName,
    completionValues,
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
  const plan = planForCompletedStep({
    instance: stepState.instance,
    currentStepId: stepState.stepId,
    completionValues: {},
    useRouteRules: false,
  });
  assertCycleAllowed(stepState.instance, plan);

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

  await applyAdvancePlan({
    instance: stepState.instance,
    currentStepId: stepState.stepId,
    completedAt: now,
    organizationId: params.organizationId,
    completedByUserId: params.userId,
    plan,
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
      deactivatedAt: null,
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

export async function updateFmsStepPlannedAt(params: {
  stepStateId: string;
  organizationId: string;
  plannedAt: Date;
}) {
  const stepState = await prisma.fmsStepState.findFirst({
    where: {
      id: params.stepStateId,
      instance: { organizationId: params.organizationId, status: "ACTIVE" },
    },
  });

  if (!stepState) {
    throw new Error("Step not found");
  }

  await prisma.fmsStepState.update({
    where: { id: stepState.id },
    data: {
      plannedAt: params.plannedAt,
      whatsappDueSoonSentAt: null,
      whatsappSameDaySentAt: null,
      whatsappOverdueSentAt: null,
    },
  });
}

export { handleFmsStepCompletedWithValues } from "@/lib/fms/handoff-engine";
