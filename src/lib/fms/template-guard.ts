import type { FmsSlaType } from "@prisma/client";
import type { FmsCaptureField, FmsSlaConfig } from "@/lib/fms/constants";

export type FmsTemplateStepDraft = {
  stepName: string;
  roleLabel?: string;
  defaultOwnerUserId?: string;
  slaType: FmsSlaType;
  slaConfig: FmsSlaConfig;
  allowMarkDone?: boolean;
  allowUpload?: boolean;
  allowNotes?: boolean;
  captureFields?: FmsCaptureField[];
};

function normalizeStep(step: FmsTemplateStepDraft) {
  return {
    stepName: step.stepName.trim(),
    roleLabel: step.roleLabel?.trim() || null,
    defaultOwnerUserId: step.defaultOwnerUserId || null,
    slaType: step.slaType,
    slaConfig: step.slaConfig ?? {},
    allowMarkDone: step.allowMarkDone ?? true,
    allowUpload: step.allowUpload ?? true,
    allowNotes: step.allowNotes ?? true,
    captureFields: step.captureFields ?? [],
  };
}

export function fmsTemplateStepsFingerprint(steps: FmsTemplateStepDraft[]) {
  return JSON.stringify(steps.map(normalizeStep));
}

export function fmsTemplateStepsLockedMessage(jobCount: number) {
  const jobLabel = jobCount === 1 ? "1 job" : `${jobCount} jobs`;
  const finishLabel =
    jobCount === 1
      ? "that job finishes or is cancelled"
      : "those jobs finish or are cancelled";
  return `This workflow has ${jobLabel}. Stop structure cannot change until ${finishLabel}. You can still update the workflow name and notification settings.`;
}
