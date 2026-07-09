import "server-only";

import {
  FmsDesignStatus,
  FmsFormStatus,
  FmsTemplateStatus,
  type FmsSlaType,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { DEFAULT_FMS_ALERT_CONFIG } from "@/lib/fms/constants";
import { flowStepToTemplateStep, resolveFlowOwner } from "@/lib/fms/flow-design";
import type { FmsFlowchartStep } from "@/lib/fms/flow-design";
import type { FmsAssignableMember } from "@/lib/fms/flow-owner-resolve";
import { getIntakeFieldsForWorkflowTemplate } from "@/lib/fms/form-templates";
import {
  getFmsWorkflowTemplate,
  templateToFlowchartSteps,
} from "@/lib/fms/workflow-templates";

async function loadAssignableMembers(organizationId: string): Promise<FmsAssignableMember[]> {
  const memberships = await prisma.membership.findMany({
    where: { organizationId, deactivatedAt: null },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return memberships.map((membership) => ({
    id: membership.user.id,
    name: membership.user.name ?? membership.user.email,
    email: membership.user.email,
    role: membership.role,
    department: membership.department,
    designation: membership.designation,
  }));
}

function workflowToFlowchartSteps(
  presetId: string,
  members: FmsAssignableMember[],
): FmsFlowchartStep[] {
  const template = getFmsWorkflowTemplate(presetId);
  if (!template) {
    throw new Error(`Unknown FMS preset: ${presetId}`);
  }

  return templateToFlowchartSteps(template).map((step) => ({
    ...step,
    ownerUserId:
      resolveFlowOwner(step.ownerRoleLabel ?? step.stepName, members) ||
      members[0]?.id ||
      "",
  }));
}

export async function findFmsTemplateByPresetId(
  organizationId: string,
  presetId: string,
) {
  const workflow = getFmsWorkflowTemplate(presetId);
  if (!workflow) {
    return null;
  }

  return prisma.fmsTemplate.findFirst({
    where: {
      organizationId,
      status: FmsTemplateStatus.ACTIVE,
      form: {
        name: workflow.name,
        status: FmsFormStatus.ACTIVE,
      },
    },
    include: {
      form: true,
      steps: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function ensureFmsPresetProvisioned(
  organizationId: string,
  presetId: string,
  creatorUserId: string,
) {
  const existing = await findFmsTemplateByPresetId(organizationId, presetId);
  if (existing) {
    return existing;
  }

  const workflow = getFmsWorkflowTemplate(presetId);
  if (!workflow) {
    throw new Error(`Unknown FMS preset: ${presetId}`);
  }

  const members = await loadAssignableMembers(organizationId);
  const flowSteps = workflowToFlowchartSteps(presetId, members);
  const templateSteps = flowSteps.map(flowStepToTemplateStep);
  const intakeFields = getIntakeFieldsForWorkflowTemplate(presetId) ?? [];

  const form = await prisma.fmsForm.create({
    data: {
      organizationId,
      name: workflow.name,
      description: workflow.description,
      status: FmsFormStatus.ACTIVE,
      createdById: creatorUserId,
      fields: {
        create: intakeFields.map((field) => ({
          sortOrder: field.sortOrder,
          label: field.label,
          fieldKey: field.fieldKey,
          fieldType: field.fieldType,
          required: field.required ?? false,
          options: field.options ?? [],
          placeholder: field.placeholder,
          helpText: field.helpText,
        })),
      },
    },
  });

  const fmsTemplate = await prisma.fmsTemplate.create({
    data: {
      organizationId,
      formId: form.id,
      name: `${workflow.name} workflow`,
      status: FmsTemplateStatus.ACTIVE,
      holidayDates: [],
      alertConfig: DEFAULT_FMS_ALERT_CONFIG as Prisma.InputJsonValue,
      createdById: creatorUserId,
      steps: {
        create: templateSteps.map((step, index) => ({
          sortOrder: index,
          stepName: step.stepName,
          roleLabel: step.roleLabel,
          instructions: step.instructions,
          defaultOwnerUserId: step.defaultOwnerUserId || null,
          slaType: step.slaType as FmsSlaType,
          slaConfig: step.slaConfig as Prisma.InputJsonValue,
          allowMarkDone: step.allowMarkDone,
          allowUpload: step.allowUpload,
          allowNotes: step.allowNotes,
          captureFields: step.captureFields,
        })),
      },
    },
    include: {
      form: true,
      steps: { orderBy: { sortOrder: "asc" } },
    },
  });

  await prisma.fmsFlowDesign.create({
    data: {
      organizationId,
      name: workflow.name,
      description: workflow.description,
      status: FmsDesignStatus.APPROVED,
      steps: flowSteps as unknown as Prisma.InputJsonValue,
      holidayDates: [],
      alertConfig: DEFAULT_FMS_ALERT_CONFIG as Prisma.InputJsonValue,
      formId: form.id,
      createdById: creatorUserId,
      approvedById: creatorUserId,
      approvedAt: new Date(),
      submittedAt: new Date(),
    },
  });

  return fmsTemplate;
}
