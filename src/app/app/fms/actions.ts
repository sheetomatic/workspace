"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  FmsFormFieldType,
  FmsSlaType,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { canManageFms, canSubmitFmsForm, canCompleteFmsStep } from "@/lib/fms/access";
import { getFmsActor } from "@/lib/fms/session";
import { recordFmsAudit } from "@/lib/fms/audit";
import {
  buildStubFormAiPrompt,
  countMeaningfulFormFields,
  isStubFmsForm,
} from "@/lib/fms/form-ai";
import {
  slugifyFieldKey,
  applySubmissionTimestamp,
  parseHolidayDates,
  parseAlertConfig,
  serializeFieldOptions,
  type FmsCaptureField,
  type FmsFieldWidth,
  type FmsFieldOptionsInput,
  type FmsSlaConfig,
} from "@/lib/fms/constants";
import {
  buildReferenceLabel,
  completeFmsStep,
  createFmsInstanceFromSubmission,
} from "@/lib/fms/instance-lifecycle";
import {
  parseCaptureFields,
  validateCaptureFields,
} from "@/lib/fms/capture-fields";
import { validateFmsAttachmentFile } from "@/lib/fms/attachment-limits";
import {
  fmsTemplateStepsFingerprint,
  fmsTemplateStepsLockedMessage,
} from "@/lib/fms/template-guard";
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
  workflowHint?: string;
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

    const isStub =
      input.existingDraft && isStubFmsForm(input.existingDraft);
    const prompt =
      isStub && input.existingDraft
        ? buildStubFormAiPrompt(
            input.existingDraft,
            description,
            input.workflowHint,
          )
        : description;

    const { draft, usage } = await parseFmsFormFromDescription(
      prompt,
      isStub ? undefined : input.existingDraft,
    );

    if (countMeaningfulFormFields(draft) === 0) {
      return {
        ok: false,
        message:
          "AI did not suggest enough fields. Try again or describe vendor name, amount, dates, and documents.",
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
    options?: string[] | FmsFieldOptionsInput;
    placeholder?: string;
    helpText?: string;
    width?: FmsFieldWidth;
    dependsOn?: string;
    choicesByParent?: Record<string, string[]>;
  }[];
  return parsed.map((field, index) => {
    const fieldKey = slugifyFieldKey(field.label);
    const width = field.width ?? "full";
    let optionsInput: FmsFieldOptionsInput;

    if (field.dependsOn && field.choicesByParent) {
      optionsInput = {
        dependsOn: field.dependsOn,
        choicesByParent: field.choicesByParent,
        width,
      };
    } else if (Array.isArray(field.options)) {
      optionsInput = { choices: field.options, width };
    } else if (field.options && typeof field.options === "object") {
      optionsInput = { ...field.options, width: field.options.width ?? width };
    } else {
      optionsInput = { choices: [], width };
    }

    return {
      sortOrder: index,
      label: field.label.trim(),
      fieldKey,
      fieldType: field.fieldType,
      required: Boolean(field.required),
      options: serializeFieldOptions(field.fieldType, optionsInput, width),
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
  const actor = await getFmsActor();
  if (!actor.ok) {
    throw new Error(actor.message);
  }
  if (!canManageFms(actor.user.role)) {
    throw new Error("You cannot manage forms or FMS.");
  }
  return actor.user;
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
    const holidayDatesRaw = formData.get("holidayDatesJson")?.toString() ?? "[]";
    const holidayDates = parseHolidayDates(JSON.parse(holidayDatesRaw));
    const alertConfigRaw = formData.get("alertConfigJson")?.toString() ?? "{}";
    const alertConfig = parseAlertConfig(JSON.parse(alertConfigRaw));

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
        holidayDates,
        alertConfig,
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
            allowUpload: step.allowUpload ?? true,
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
    const holidayDatesRaw = formData.get("holidayDatesJson")?.toString() ?? "[]";
    const holidayDates = parseHolidayDates(JSON.parse(holidayDatesRaw));
    const alertConfigRaw = formData.get("alertConfigJson")?.toString() ?? "{}";
    const alertConfig = parseAlertConfig(JSON.parse(alertConfigRaw));

    const template = await prisma.fmsTemplate.findFirst({
      where: { id: templateId, organizationId: user.organizationId },
      include: { steps: { orderBy: { sortOrder: "asc" } } },
    });
    if (!template) {
      return { ok: false, message: "FMS workflow not found." };
    }

    const steps = parseStepsJson(stepsRaw);
    if (steps.length === 0) {
      return { ok: false, message: "Add at least one step." };
    }

    const linkedJobCount = await prisma.fmsInstance.count({
      where: { templateId },
    });

    const existingFingerprint = fmsTemplateStepsFingerprint(
      template.steps.map((step) => ({
        stepName: step.stepName,
        roleLabel: step.roleLabel ?? undefined,
        defaultOwnerUserId: step.defaultOwnerUserId ?? undefined,
        slaType: step.slaType,
        slaConfig: step.slaConfig as FmsSlaConfig,
        allowMarkDone: step.allowMarkDone,
        allowUpload: step.allowUpload,
        allowNotes: step.allowNotes,
        captureFields: step.captureFields as FmsCaptureField[],
      })),
    );
    const nextFingerprint = fmsTemplateStepsFingerprint(steps);

    if (linkedJobCount > 0) {
      if (existingFingerprint !== nextFingerprint) {
        return {
          ok: false,
          message: fmsTemplateStepsLockedMessage(linkedJobCount),
        };
      }

      await prisma.fmsTemplate.update({
        where: { id: templateId },
        data: {
          name,
          status: activate ? "ACTIVE" : template.status,
          holidayDates,
          alertConfig,
        },
      });

      revalidatePath("/app/fms");
      revalidatePath(`/app/fms/forms/${template.formId}`);
      return {
        ok: true,
        message:
          "Workflow name and notification settings saved. Stop structure is locked while jobs are active.",
      };
    }

    await prisma.$transaction([
      prisma.fmsTemplateStep.deleteMany({ where: { templateId } }),
      prisma.fmsTemplate.update({
        where: { id: templateId },
        data: {
          name,
          status: activate ? "ACTIVE" : template.status,
          holidayDates,
          alertConfig,
          steps: {
            create: steps.map((step, index) => ({
              sortOrder: index,
              stepName: step.stepName.trim(),
              roleLabel: step.roleLabel?.trim() || null,
              defaultOwnerUserId: step.defaultOwnerUserId || null,
              slaType: step.slaType,
              slaConfig: step.slaConfig ?? {},
              allowMarkDone: step.allowMarkDone ?? true,
              allowUpload: step.allowUpload ?? true,
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
    const actor = await getFmsActor();
    if (!actor.ok) {
      return { ok: false, message: actor.message };
    }
    const user = actor.user;

    if (!canSubmitFmsForm(user)) {
      return { ok: false, message: "You cannot submit FMS forms." };
    }

    const formId = formData.get("formId")?.toString() ?? "";
    const valuesRaw = formData.get("valuesJson")?.toString() ?? "{}";
    let values = JSON.parse(valuesRaw) as Record<string, unknown>;

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

    values = applySubmissionTimestamp(values, form.fields);

    for (const field of form.fields) {
      if (field.fieldType === "FILE") {
        continue;
      }
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
      await recordFmsAudit({
        organizationId: user.organizationId,
        userId: user.id,
        action: "FORM_SUBMITTED",
        instanceId: instance.id,
        summary: `Form "${form.name}" submitted; pipeline started.`,
        metadata: { formId: form.id, referenceLabel },
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
    const actor = await getFmsActor();
    if (!actor.ok) {
      return { ok: false, message: actor.message };
    }
    const user = actor.user;

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

    if (stepState.status !== "IN_PROGRESS") {
      return { ok: false, message: "This step is not active." };
    }

    if (!canCompleteFmsStep(user, stepState)) {
      if (!stepState.ownerUserId) {
        return {
          ok: false,
          message: "This step has no owner. Ask a manager to assign someone first.",
        };
      }
      return { ok: false, message: "You are not allowed to complete this step." };
    }

    const captureFields = parseCaptureFields(stepState.step.captureFields);
    const captureCheck = validateCaptureFields(captureFields, completionValues);
    if (!captureCheck.ok) {
      return { ok: false, message: captureCheck.message };
    }

    const file = formData.get("attachment");
    let attachmentBuffer: Buffer | null = null;
    let attachmentMeta: {
      fileName: string;
      mimeType: string;
      fileSize: number;
    } | null = null;

    if (file instanceof File && file.size > 0) {
      const fileCheck = validateFmsAttachmentFile(file);
      if (!fileCheck.ok) {
        return { ok: false, message: fileCheck.message };
      }

      attachmentBuffer = Buffer.from(await file.arrayBuffer());
      attachmentMeta = {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
      };
    }

    await completeFmsStep({
      stepStateId,
      organizationId: user.organizationId,
      userId: user.id,
      notes,
      completionValues,
    });

    await recordFmsAudit({
      organizationId: user.organizationId,
      userId: user.id,
      action: "STEP_COMPLETED",
      instanceId: stepState.instanceId,
      summary: `Completed "${stepState.step.stepName}".`,
      metadata: { stepStateId, notes: notes || null },
    });

    if (attachmentBuffer && attachmentMeta) {
      await prisma.fmsStepAttachment.create({
        data: {
          stepStateId,
          uploadedById: user.id,
          fileName: attachmentMeta.fileName,
          mimeType: attachmentMeta.mimeType,
          fileSize: attachmentMeta.fileSize,
          data: new Uint8Array(attachmentBuffer),
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

export async function deleteFmsFormAction(
  _prev: FmsActionState,
  formData: FormData,
): Promise<FmsActionState> {
  try {
    const user = await requireFmsAdmin();
    const formId = formData.get("formId")?.toString() ?? "";
    const confirmName = formData.get("confirmName")?.toString().trim() ?? "";

    if (!formId) {
      return { ok: false, message: "Form not found." };
    }

    const form = await prisma.fmsForm.findFirst({
      where: { id: formId, organizationId: user.organizationId },
      include: {
        template: { select: { id: true } },
        _count: { select: { submissions: true } },
      },
    });

    if (!form) {
      return { ok: false, message: "Form not found." };
    }

    if (confirmName !== form.name) {
      return {
        ok: false,
        message:
          "Type the exact form name to confirm delete. This removes the workflow, submissions, and active jobs.",
      };
    }

    await prisma.fmsForm.delete({ where: { id: formId } });

    revalidatePath("/app/fms");
    redirect("/app/fms");
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }
    console.error("deleteFmsFormAction", error);
    return { ok: false, message: "Could not delete form." };
  }
}
