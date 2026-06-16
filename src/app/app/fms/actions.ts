"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  FmsFormFieldType,
  FmsSlaType,
  Prisma,
} from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageFms } from "@/lib/fms/access";
import {
  slugifyFieldKey,
  type FmsCaptureField,
  type FmsSlaConfig,
} from "@/lib/fms/constants";
import {
  buildReferenceLabel,
  completeFmsStep,
  createFmsInstanceFromSubmission,
} from "@/lib/fms/instance-lifecycle";
import { isNextRedirect } from "@/lib/next-redirect";
import {
  type FmsActionState,
  type FmsAiGenerateResult,
} from "@/lib/fms-action-state";
import {
  parseFmsFormFromDescription,
  type ParsedFmsFormDraft,
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

export async function generateFmsFormFromAiAction(input: {
  description: string;
  existingDraft?: ParsedFmsFormDraft;
}): Promise<FmsAiGenerateResult> {
  try {
    const user = await requireFmsAdmin();
    const description = input.description?.trim() ?? "";

    if (description.length < 8) {
      return {
        ok: false,
        message: "Describe your form in at least a few words.",
      };
    }

    const rate = await checkRateLimit(
      `fms-form-ai:${user.organizationId}:${user.id}`,
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

    const { draft, usage } = await parseFmsFormFromDescription(
      description,
      input.existingDraft,
    );

    if (draft.fields.length === 0) {
      return {
        ok: false,
        message: "AI did not suggest any fields. Try a more specific description.",
      };
    }

    await recordTaskAiUsage({
      organizationId: user.organizationId,
      userId: user.id,
      route: "parse",
      usage: {
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
      },
    });

    return { ok: true, draft };
  } catch (error) {
    const raw =
      error instanceof Error ? error.message : "Failed to generate form.";
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
    console.error("generateFmsFormFromAiAction", error);
    return { ok: false, message: mapFmsOpenAiServiceError(raw) };
  }
}

function parseOptions(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseFieldsJson(raw: string) {
  const parsed = JSON.parse(raw) as {
    label: string;
    fieldType: FmsFormFieldType;
    required?: boolean;
    options?: string[];
    placeholder?: string;
    helpText?: string;
  }[];
  return parsed.map((field, index) => {
    const fieldKey = slugifyFieldKey(field.label);
    return {
      sortOrder: index,
      label: field.label.trim(),
      fieldKey,
      fieldType: field.fieldType,
      required: Boolean(field.required),
      options: field.options ?? [],
      placeholder: field.placeholder?.trim() || null,
      helpText: field.helpText?.trim() || null,
    };
  });
}

function parseStepsJson(raw: string) {
  return JSON.parse(raw) as {
    stepName: string;
    roleLabel?: string;
    defaultOwnerUserId?: string;
    slaType: FmsSlaType;
    slaConfig: FmsSlaConfig;
    allowMarkDone?: boolean;
    allowUpload?: boolean;
    allowNotes?: boolean;
    captureFields?: FmsCaptureField[];
  }[];
}

async function requireFmsAdmin() {
  const user = await getSessionUser();
  if (!user || !canManageFms(user.role)) {
    throw new Error("You cannot manage forms or FMS.");
  }
  return user;
}

export async function createFmsForm(
  _prev: FmsActionState,
  formData: FormData,
): Promise<FmsActionState> {
  try {
    const user = await requireFmsAdmin();
    const name = formData.get("name")?.toString().trim() ?? "";
    const description = formData.get("description")?.toString().trim() || null;
    const fieldsRaw = formData.get("fieldsJson")?.toString() ?? "[]";

    if (!name) {
      return { ok: false, message: "Form name is required." };
    }

    const fields = parseFieldsJson(fieldsRaw);
    if (fields.length === 0) {
      return { ok: false, message: "Add at least one field." };
    }

    const form = await prisma.fmsForm.create({
      data: {
        organizationId: user.organizationId,
        name,
        description,
        createdById: user.id,
        fields: { create: fields },
      },
    });

    revalidatePath("/app/fms");
    redirect(`/app/fms/forms/${form.id}`);
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }
    console.error("createFmsForm", error);
    return { ok: false, message: "Could not create form." };
  }
}

export async function updateFmsForm(
  _prev: FmsActionState,
  formData: FormData,
): Promise<FmsActionState> {
  try {
    const user = await requireFmsAdmin();
    const formId = formData.get("formId")?.toString() ?? "";
    const name = formData.get("name")?.toString().trim() ?? "";
    const description = formData.get("description")?.toString().trim() || null;
    const fieldsRaw = formData.get("fieldsJson")?.toString() ?? "[]";
    const publish = formData.get("publish") === "1";

    const existing = await prisma.fmsForm.findFirst({
      where: { id: formId, organizationId: user.organizationId },
    });
    if (!existing) {
      return { ok: false, message: "Form not found." };
    }

    const fields = parseFieldsJson(fieldsRaw);
    if (fields.length === 0) {
      return { ok: false, message: "Add at least one field." };
    }

    await prisma.$transaction([
      prisma.fmsFormField.deleteMany({ where: { formId } }),
      prisma.fmsForm.update({
        where: { id: formId },
        data: {
          name,
          description,
          status: publish ? "ACTIVE" : existing.status,
          fields: { create: fields },
        },
      }),
    ]);

    revalidatePath("/app/fms");
    revalidatePath(`/app/fms/forms/${formId}`);
    return { ok: true, message: publish ? "Form published." : "Form saved." };
  } catch (error) {
    console.error("updateFmsForm", error);
    return { ok: false, message: "Could not update form." };
  }
}

export async function createFmsTemplate(
  _prev: FmsActionState,
  formData: FormData,
): Promise<FmsActionState> {
  try {
    const user = await requireFmsAdmin();
    const formId = formData.get("formId")?.toString() ?? "";
    const name = formData.get("name")?.toString().trim() ?? "";
    const stepsRaw = formData.get("stepsJson")?.toString() ?? "[]";
    const activate = formData.get("activate") === "1";

    if (!name) {
      return { ok: false, message: "FMS name is required." };
    }

    const form = await prisma.fmsForm.findFirst({
      where: { id: formId, organizationId: user.organizationId },
      include: { template: true },
    });
    if (!form) {
      return { ok: false, message: "Form not found." };
    }
    if (form.template) {
      return { ok: false, message: "This form already has an FMS workflow." };
    }

    const steps = parseStepsJson(stepsRaw);
    if (steps.length === 0) {
      return { ok: false, message: "Add at least one step." };
    }

    await prisma.fmsForm.update({
      where: { id: formId },
      data: { status: "ACTIVE" },
    });

    await prisma.fmsTemplate.create({
      data: {
        organizationId: user.organizationId,
        formId,
        name,
        status: activate ? "ACTIVE" : "DRAFT",
        createdById: user.id,
        steps: {
          create: steps.map((step, index) => ({
            sortOrder: index,
            stepName: step.stepName.trim(),
            roleLabel: step.roleLabel?.trim() || null,
            defaultOwnerUserId: step.defaultOwnerUserId || null,
            slaType: step.slaType,
            slaConfig: step.slaConfig ?? {},
            allowMarkDone: step.allowMarkDone ?? true,
            allowUpload: step.allowUpload ?? false,
            allowNotes: step.allowNotes ?? true,
            captureFields: step.captureFields ?? [],
          })),
        },
      },
    });

    revalidatePath("/app/fms");
    revalidatePath(`/app/fms/forms/${formId}`);
    return {
      ok: true,
      message: activate ? "FMS workflow is live." : "FMS workflow saved as draft.",
    };
  } catch (error) {
    console.error("createFmsTemplate", error);
    return { ok: false, message: "Could not create FMS workflow." };
  }
}

export async function updateFmsTemplate(
  _prev: FmsActionState,
  formData: FormData,
): Promise<FmsActionState> {
  try {
    const user = await requireFmsAdmin();
    const templateId = formData.get("templateId")?.toString() ?? "";
    const name = formData.get("name")?.toString().trim() ?? "";
    const stepsRaw = formData.get("stepsJson")?.toString() ?? "[]";
    const activate = formData.get("activate") === "1";

    const template = await prisma.fmsTemplate.findFirst({
      where: { id: templateId, organizationId: user.organizationId },
    });
    if (!template) {
      return { ok: false, message: "FMS workflow not found." };
    }

    const steps = parseStepsJson(stepsRaw);
    if (steps.length === 0) {
      return { ok: false, message: "Add at least one step." };
    }

    await prisma.$transaction([
      prisma.fmsTemplateStep.deleteMany({ where: { templateId } }),
      prisma.fmsTemplate.update({
        where: { id: templateId },
        data: {
          name,
          status: activate ? "ACTIVE" : template.status,
          steps: {
            create: steps.map((step, index) => ({
              sortOrder: index,
              stepName: step.stepName.trim(),
              roleLabel: step.roleLabel?.trim() || null,
              defaultOwnerUserId: step.defaultOwnerUserId || null,
              slaType: step.slaType,
              slaConfig: step.slaConfig ?? {},
              allowMarkDone: step.allowMarkDone ?? true,
              allowUpload: step.allowUpload ?? false,
              allowNotes: step.allowNotes ?? true,
              captureFields: step.captureFields ?? [],
            })),
          },
        },
      }),
    ]);

    revalidatePath("/app/fms");
    revalidatePath(`/app/fms/forms/${template.formId}`);
    return { ok: true, message: "FMS workflow updated." };
  } catch (error) {
    console.error("updateFmsTemplate", error);
    return { ok: false, message: "Could not update FMS workflow." };
  }
}

export async function submitFmsForm(
  _prev: FmsActionState,
  formData: FormData,
): Promise<FmsActionState> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { ok: false, message: "Sign in required." };
    }

    const formId = formData.get("formId")?.toString() ?? "";
    const valuesRaw = formData.get("valuesJson")?.toString() ?? "{}";
    const values = JSON.parse(valuesRaw) as Record<string, unknown>;

    const form = await prisma.fmsForm.findFirst({
      where: {
        id: formId,
        organizationId: user.organizationId,
        status: "ACTIVE",
      },
      include: {
        fields: { orderBy: { sortOrder: "asc" } },
        template: { include: { steps: { orderBy: { sortOrder: "asc" } } } },
      },
    });

    if (!form) {
      return { ok: false, message: "Form not found or not active." };
    }

    for (const field of form.fields) {
      if (!field.required) {
        continue;
      }
      const value = values[field.fieldKey];
      if (
        value === undefined ||
        value === null ||
        (typeof value === "string" && !value.trim()) ||
        (Array.isArray(value) && value.length === 0)
      ) {
        return { ok: false, message: `${field.label} is required.` };
      }
    }

    const submission = await prisma.fmsFormSubmission.create({
      data: {
        organizationId: user.organizationId,
        formId: form.id,
        submittedById: user.id,
        values: values as Prisma.InputJsonValue,
      },
    });

    if (form.template?.status === "ACTIVE") {
      const referenceLabel = buildReferenceLabel(values, form.fields);
      const instance = await createFmsInstanceFromSubmission({
        organizationId: user.organizationId,
        template: form.template,
        submissionId: submission.id,
        referenceLabel,
      });
      revalidatePath("/app/fms");
      redirect(`/app/fms/instances/${instance.id}`);
    }

    revalidatePath("/app/fms");
    return { ok: true, message: "Form submitted. No active FMS workflow linked yet." };
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }
    console.error("submitFmsForm", error);
    return { ok: false, message: "Could not submit form." };
  }
}

export async function completeFmsStepAction(
  _prev: FmsActionState,
  formData: FormData,
): Promise<FmsActionState> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { ok: false, message: "Sign in required." };
    }

    const stepStateId = formData.get("stepStateId")?.toString() ?? "";
    const notes = formData.get("notes")?.toString() ?? "";
    const completionValuesRaw =
      formData.get("completionValuesJson")?.toString() ?? "{}";
    const completionValues = JSON.parse(completionValuesRaw) as Record<
      string,
      unknown
    >;

    const stepState = await prisma.fmsStepState.findFirst({
      where: {
        id: stepStateId,
        instance: { organizationId: user.organizationId },
      },
      include: { step: true },
    });

    if (!stepState) {
      return { ok: false, message: "Step not found." };
    }

    if (stepState.status === "DONE") {
      return { ok: false, message: "Step already completed." };
    }

    const isOwner = stepState.ownerUserId === user.id;
    const isAdmin = canManageFms(user.role);
    if (!isOwner && !isAdmin) {
      return { ok: false, message: "You are not the owner of this step." };
    }

    await completeFmsStep({
      stepStateId,
      organizationId: user.organizationId,
      userId: user.id,
      notes,
      completionValues,
    });

    const file = formData.get("attachment");
    if (file instanceof File && file.size > 0 && stepState.step.allowUpload) {
      const buffer = Buffer.from(await file.arrayBuffer());
      await prisma.fmsStepAttachment.create({
        data: {
          stepStateId,
          uploadedById: user.id,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
          data: buffer,
        },
      });
    }

    revalidatePath(`/app/fms/instances/${stepState.instanceId}`);
    revalidatePath("/app/fms");
    return { ok: true, message: "Step marked done." };
  } catch (error) {
    console.error("completeFmsStepAction", error);
    return { ok: false, message: "Could not complete step." };
  }
}
