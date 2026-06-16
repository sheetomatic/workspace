"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  canApproveFmsFlow,
  canManageFms,
  canSubmitFmsFlow,
} from "@/lib/fms/access";
import { parseHolidayDates, parseAlertConfig } from "@/lib/fms/constants";
import {
  flowStepToTemplateStep,
  parseFlowchartSteps,
  validateFlowchartSteps,
  type FmsFlowchartStep,
} from "@/lib/fms/flow-design";
import {
  aiFormDraftToFieldCreates,
  buildDesignIntakeAiPrompt,
} from "@/lib/fms/form-ai";
import { type FmsActionState, type FmsFlowAiGenerateResult } from "@/lib/fms-action-state";
import { isNextRedirect } from "@/lib/next-redirect";
import {
  parseFmsFlowchartFromDescription,
  parseFmsFormFromDescription,
  type ParsedFmsFlowDraft,
} from "@/lib/integrations/openai";
import {
  checkTaskAiOrgQuota,
  recordTaskAiUsage,
} from "@/lib/integrations/task-ai-settings";
import {
  FMS_AI_PARSE_UNAVAILABLE,
  mapFmsOpenAiServiceError,
} from "@/lib/integrations/openai-messages";
import { getIntegrationStatus } from "@/lib/integrations/status";
import { checkRateLimit } from "@/lib/rate-limit";
import { listAssignableMembers } from "@/lib/tasks";

async function requireFmsDesigner() {
  const user = await getSessionUser();
  if (!user || !canSubmitFmsFlow(user.role)) {
    throw new Error("You cannot design FMS workflows.");
  }
  return user;
}

async function requireFmsOwner() {
  const user = await getSessionUser();
  if (!user || !canApproveFmsFlow(user.role)) {
    throw new Error("Only the workspace owner can approve FMS designs.");
  }
  return user;
}

function parseDesignForm(formData: FormData) {
  const name = formData.get("name")?.toString().trim() ?? "";
  const description = formData.get("description")?.toString().trim() || null;
  const stepsRaw = formData.get("stepsJson")?.toString() ?? "[]";
  const holidayDatesRaw = formData.get("holidayDatesJson")?.toString() ?? "[]";
  const alertConfigRaw = formData.get("alertConfigJson")?.toString() ?? "{}";
  const steps = parseFlowchartSteps(JSON.parse(stepsRaw));
  const holidayDates = parseHolidayDates(JSON.parse(holidayDatesRaw));
  const alertConfig = parseAlertConfig(JSON.parse(alertConfigRaw));
  return { name, description, steps, holidayDates, alertConfig };
}

export async function createFmsFlowDesign(
  _prev: FmsActionState,
  formData: FormData,
): Promise<FmsActionState> {
  try {
    const user = await requireFmsDesigner();
    const { name, description, steps, holidayDates, alertConfig } =
      parseDesignForm(formData);

    if (!name) {
      return { ok: false, message: "Flow name is required." };
    }

    const design = await prisma.fmsFlowDesign.create({
      data: {
        organizationId: user.organizationId,
        name,
        description,
        steps,
        holidayDates,
        alertConfig,
        createdById: user.id,
      },
    });

    revalidatePath("/app/fms");
    redirect(`/app/fms/design/${design.id}`);
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }
    console.error("createFmsFlowDesign", error);
    return { ok: false, message: "Could not create flow design." };
  }
}

export async function updateFmsFlowDesign(
  _prev: FmsActionState,
  formData: FormData,
): Promise<FmsActionState> {
  try {
    const user = await requireFmsDesigner();
    const designId = formData.get("designId")?.toString() ?? "";
    const { name, description, steps, holidayDates, alertConfig } =
      parseDesignForm(formData);

    const existing = await prisma.fmsFlowDesign.findFirst({
      where: { id: designId, organizationId: user.organizationId },
    });
    if (!existing) {
      return { ok: false, message: "Flow design not found." };
    }
    if (existing.status !== "DRAFT" && existing.status !== "REJECTED") {
      return { ok: false, message: "This design can no longer be edited." };
    }

    if (!name) {
      return { ok: false, message: "Flow name is required." };
    }

    await prisma.fmsFlowDesign.update({
      where: { id: designId },
      data: {
        name,
        description,
        steps,
        holidayDates,
        alertConfig,
        status: existing.status === "REJECTED" ? "DRAFT" : existing.status,
        reviewNote: existing.status === "REJECTED" ? null : existing.reviewNote,
      },
    });

    revalidatePath("/app/fms");
    revalidatePath(`/app/fms/design/${designId}`);
    return { ok: true, message: "Flowchart saved." };
  } catch (error) {
    console.error("updateFmsFlowDesign", error);
    return { ok: false, message: "Could not save flow design." };
  }
}

export async function submitFmsFlowDesignForApproval(
  _prev: FmsActionState,
  formData: FormData,
): Promise<FmsActionState> {
  try {
    const user = await requireFmsDesigner();
    const designId = formData.get("designId")?.toString() ?? "";
    const { name, description, steps, holidayDates, alertConfig } =
      parseDesignForm(formData);

    const existing = await prisma.fmsFlowDesign.findFirst({
      where: { id: designId, organizationId: user.organizationId },
    });
    if (!existing) {
      return { ok: false, message: "Flow design not found." };
    }
    if (existing.status === "APPROVED" || existing.status === "PENDING_APPROVAL") {
      return { ok: false, message: "This design is already submitted or live." };
    }

    if (!name) {
      return { ok: false, message: "Flow name is required." };
    }

    const validation = validateFlowchartSteps(steps);
    if (!validation.ok) {
      return { ok: false, message: validation.message };
    }

    await prisma.fmsFlowDesign.update({
      where: { id: designId },
      data: {
        name,
        description,
        steps: validation.steps,
        holidayDates,
        alertConfig,
        status: "PENDING_APPROVAL",
        submittedAt: new Date(),
        reviewNote: null,
      },
    });

    revalidatePath("/app/fms");
    revalidatePath(`/app/fms/design/${designId}`);
    return {
      ok: true,
      message: "Submitted for owner approval. FMS will be created once approved.",
    };
  } catch (error) {
    console.error("submitFmsFlowDesignForApproval", error);
    return { ok: false, message: "Could not submit for approval." };
  }
}

async function buildIntakeFieldsForDesign(
  design: {
    name: string;
    description: string | null;
    organizationId: string;
  },
  steps: import("@/lib/fms/flow-design").FmsFlowchartStep[],
  approverId: string,
) {
  const fallback = [
    {
      sortOrder: 0,
      label: "Request title",
      fieldKey: "request_title",
      fieldType: "TEXT" as const,
      required: true,
      options: [],
      placeholder: "Brief subject for this request",
      helpText: null,
    },
    {
      sortOrder: 1,
      label: "Submission timestamp",
      fieldKey: "submission_timestamp",
      fieldType: "DATETIME" as const,
      required: false,
      options: [],
      placeholder: null,
      helpText: "Filled automatically on submit",
    },
  ];

  const status = getIntegrationStatus();
  if (!status.openai) {
    return fallback;
  }

  try {
    const orgQuota = await checkTaskAiOrgQuota(design.organizationId);
    if (!orgQuota.allowed) {
      return fallback;
    }

    const prompt = buildDesignIntakeAiPrompt({
      name: design.name,
      description: design.description,
      steps,
    });
    const { draft, usage } = await parseFmsFormFromDescription(prompt);
    if (draft.fields.length === 0) {
      return fallback;
    }

    await recordTaskAiUsage({
      organizationId: design.organizationId,
      userId: approverId,
      route: "parse",
      usage,
    });

    return aiFormDraftToFieldCreates(draft);
  } catch (error) {
    console.error("buildIntakeFieldsForDesign", error);
    return fallback;
  }
}

async function provisionFmsFromDesign(
  design: {
    id: string;
    name: string;
    description: string | null;
    steps: unknown;
    holidayDates: unknown;
    alertConfig: unknown;
    organizationId: string;
  },
  approverId: string,
) {
  const steps = parseFlowchartSteps(design.steps);
  const validation = validateFlowchartSteps(steps);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const templateSteps = validation.steps.map(flowStepToTemplateStep);
  const holidayDates = parseHolidayDates(design.holidayDates);
  const alertConfig = parseAlertConfig(design.alertConfig);

  const aiFields = await buildIntakeFieldsForDesign(design, validation.steps, approverId);

  return prisma.$transaction(async (tx) => {
    const form = await tx.fmsForm.create({
      data: {
        organizationId: design.organizationId,
        name: design.name,
        description:
          design.description ??
          "Auto-created intake form. Refine fields anytime with AI in the form editor.",
        status: "ACTIVE",
        createdById: approverId,
        fields: {
          create: aiFields,
        },
      },
    });

    await tx.fmsTemplate.create({
      data: {
        organizationId: design.organizationId,
        formId: form.id,
        name: `${design.name} workflow`,
        status: "ACTIVE",
        holidayDates,
        alertConfig,
        createdById: approverId,
        steps: {
          create: templateSteps.map((step, index) => ({
            sortOrder: index,
            stepName: step.stepName,
            roleLabel: step.roleLabel,
            instructions: step.instructions,
            defaultOwnerUserId: step.defaultOwnerUserId,
            slaType: step.slaType,
            slaConfig: step.slaConfig,
            allowMarkDone: step.allowMarkDone,
            allowUpload: step.allowUpload,
            allowNotes: step.allowNotes,
            captureFields: step.captureFields,
          })),
        },
      },
    });

    await tx.fmsFlowDesign.update({
      where: { id: design.id },
      data: {
        status: "APPROVED",
        formId: form.id,
        approvedById: approverId,
        approvedAt: new Date(),
      },
    });

    return form.id;
  });
}

export async function provisionApprovedFmsDesign(
  _prev: FmsActionState,
  formData: FormData,
): Promise<FmsActionState> {
  try {
    const user = await getSessionUser();
    if (!user || (!canApproveFmsFlow(user.role) && !canSubmitFmsFlow(user.role))) {
      return { ok: false, message: "You cannot create live FMS for this design." };
    }

    const designId = formData.get("designId")?.toString() ?? "";
    const design = await prisma.fmsFlowDesign.findFirst({
      where: {
        id: designId,
        organizationId: user.organizationId,
        status: "APPROVED",
        formId: null,
      },
    });
    if (!design) {
      return {
        ok: false,
        message: "Approved design not found or live FMS already exists.",
      };
    }

    const formId = await provisionFmsFromDesign(design, user.id);

    revalidatePath("/app/fms");
    revalidatePath(`/app/fms/design/${designId}`);
    revalidatePath(`/app/fms/forms/${formId}`);
    redirect(`/app/fms/design/${designId}?approved=1`);
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }
    console.error("provisionApprovedFmsDesign", error);
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not create form and workflow.",
    };
  }
}

export async function approveFmsFlowDesign(
  _prev: FmsActionState,
  formData: FormData,
): Promise<FmsActionState> {
  try {
    const user = await requireFmsOwner();
    const designId = formData.get("designId")?.toString() ?? "";

    const design = await prisma.fmsFlowDesign.findFirst({
      where: {
        id: designId,
        organizationId: user.organizationId,
        status: "PENDING_APPROVAL",
      },
    });
    if (!design) {
      return { ok: false, message: "Pending design not found." };
    }

    const formId = await provisionFmsFromDesign(design, user.id);

    revalidatePath("/app/fms");
    revalidatePath(`/app/fms/design/${designId}`);
    revalidatePath(`/app/fms/forms/${formId}`);
    redirect(`/app/fms/design/${designId}?approved=1`);
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }
    console.error("approveFmsFlowDesign", error);
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not approve design.",
    };
  }
}

export async function rejectFmsFlowDesign(
  _prev: FmsActionState,
  formData: FormData,
): Promise<FmsActionState> {
  try {
    const user = await requireFmsOwner();
    const designId = formData.get("designId")?.toString() ?? "";
    const reviewNote = formData.get("reviewNote")?.toString().trim() || null;

    const design = await prisma.fmsFlowDesign.findFirst({
      where: {
        id: designId,
        organizationId: user.organizationId,
        status: "PENDING_APPROVAL",
      },
    });
    if (!design) {
      return { ok: false, message: "Pending design not found." };
    }

    await prisma.fmsFlowDesign.update({
      where: { id: designId },
      data: {
        status: "REJECTED",
        reviewNote,
        approvedById: user.id,
        approvedAt: new Date(),
      },
    });

    revalidatePath("/app/fms");
    revalidatePath(`/app/fms/design/${designId}`);
    return { ok: true, message: "Design rejected. Admin can revise and resubmit." };
  } catch (error) {
    console.error("rejectFmsFlowDesign", error);
    return { ok: false, message: "Could not reject design." };
  }
}

export async function deleteFmsFlowDesign(
  _prev: FmsActionState,
  formData: FormData,
): Promise<FmsActionState> {
  try {
    const user = await getSessionUser();
    if (!user || !canManageFms(user.role)) {
      return { ok: false, message: "You cannot delete this design." };
    }

    const designId = formData.get("designId")?.toString() ?? "";
    const existing = await prisma.fmsFlowDesign.findFirst({
      where: { id: designId, organizationId: user.organizationId },
    });
    if (!existing) {
      return { ok: false, message: "Design not found." };
    }
    if (existing.status === "APPROVED" && existing.formId) {
      return {
        ok: false,
        message: "Approved designs are linked to live FMS. Delete the form instead.",
      };
    }

    await prisma.fmsFlowDesign.delete({ where: { id: designId } });
    revalidatePath("/app/fms");
    redirect("/app/fms");
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }
    console.error("deleteFmsFlowDesign", error);
    return { ok: false, message: "Could not delete design." };
  }
}

export async function generateFmsFlowchartFromAiAction(input: {
  description: string;
  clarificationAnswers?: string;
  existingDraft?: ParsedFmsFlowDraft;
}): Promise<FmsFlowAiGenerateResult> {
  try {
    const user = await requireFmsDesigner();
    const description = input.description?.trim() ?? "";

    if (description.length < 6) {
      return {
        ok: false,
        message: "Describe your workflow in a few words, or use voice.",
      };
    }

    const rate = await checkRateLimit(
      `fms-flow-ai:${user.organizationId}:${user.id}`,
      30,
      60_000,
    );
    if (!rate.allowed) {
      return {
        ok: false,
        message: `Rate limit exceeded. Retry in ${rate.retryAfterSec}s.`,
      };
    }

    const orgQuota = await checkTaskAiOrgQuota(user.organizationId);
    if (!orgQuota.allowed) {
      return { ok: false, message: orgQuota.message };
    }

    const status = getIntegrationStatus();
    if (!status.openai) {
      return { ok: false, message: FMS_AI_PARSE_UNAVAILABLE };
    }

    const members = await listAssignableMembers(user.organizationId);
    const result = await parseFmsFlowchartFromDescription(description, {
      members,
      existingDraft: input.existingDraft,
      clarificationAnswers: input.clarificationAnswers,
    });

    await recordTaskAiUsage({
      organizationId: user.organizationId,
      userId: user.id,
      route: "parse",
      usage: result.usage,
    });

    if (result.status === "needs_clarification") {
      return {
        ok: true,
        needsClarification: true,
        questions: result.questions,
      };
    }

    return {
      ok: true,
      needsClarification: false,
      draft: result.draft,
    };
  } catch (error) {
    const raw =
      error instanceof Error ? error.message : "Failed to generate flowchart.";
    if (raw === "OPENAI_NOT_CONFIGURED") {
      return { ok: false, message: FMS_AI_PARSE_UNAVAILABLE };
    }
    if (raw.startsWith("OPENAI_ERROR:")) {
      return {
        ok: false,
        message: mapFmsOpenAiServiceError(
          raw.replace(/^OPENAI_ERROR:/, ""),
        ),
      };
    }
    console.error("generateFmsFlowchartFromAiAction", error);
    return { ok: false, message: mapFmsOpenAiServiceError(raw) };
  }
}
