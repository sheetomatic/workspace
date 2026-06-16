import type { FmsSlaType } from "@prisma/client";
import type { FmsSlaConfig } from "@/lib/fms/constants";

export type FmsFlowchartStep = {
  id: string;
  stepName: string;
  ownerUserId: string;
  howInstructions: string;
  tatValue: string;
  tatUnit: "hours" | "days";
};

export function newFlowchartStep(stepName = ""): FmsFlowchartStep {
  return {
    id: crypto.randomUUID(),
    stepName,
    ownerUserId: "",
    howInstructions: "",
    tatValue: "1",
    tatUnit: "days",
  };
}

export function parseFlowchartSteps(raw: unknown): FmsFlowchartStep[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const record = item as Record<string, unknown>;
      const tatUnit = record.tatUnit === "hours" ? "hours" : "days";
      return {
        id: typeof record.id === "string" ? record.id : crypto.randomUUID(),
        stepName: String(record.stepName ?? "").trim(),
        ownerUserId: String(record.ownerUserId ?? "").trim(),
        howInstructions: String(record.howInstructions ?? "").trim(),
        tatValue: String(record.tatValue ?? "1").trim() || "1",
        tatUnit,
      } satisfies FmsFlowchartStep;
    })
    .filter((step): step is FmsFlowchartStep => step !== null);
}

export function validateFlowchartSteps(steps: FmsFlowchartStep[]) {
  const valid = steps.filter(
    (step) =>
      step.stepName.trim() &&
      step.ownerUserId.trim() &&
      step.howInstructions.trim() &&
      Number(step.tatValue) > 0,
  );
  if (valid.length === 0) {
    return { ok: false as const, message: "Add at least one complete step." };
  }
  const incomplete = steps.find(
    (step) =>
      step.stepName.trim() &&
      (!step.ownerUserId.trim() ||
        !step.howInstructions.trim() ||
        Number(step.tatValue) <= 0),
  );
  if (incomplete) {
    return {
      ok: false as const,
      message: `Complete WHO, HOW, and WHEN for "${incomplete.stepName.trim()}".`,
    };
  }
  return { ok: true as const, steps: valid };
}

export function resolveFlowOwner(
  ownerHint: string | null | undefined,
  members: { id: string; name: string; email: string }[],
) {
  if (!ownerHint?.trim() || members.length === 0) {
    return members[0]?.id ?? "";
  }
  const q = ownerHint.trim().toLowerCase();
  const byEmail = members.find((m) => m.email.toLowerCase() === q);
  if (byEmail) {
    return byEmail.id;
  }
  const byName = members.find(
    (m) =>
      m.name.toLowerCase() === q ||
      m.name.toLowerCase().includes(q) ||
      q.includes(m.name.toLowerCase()),
  );
  if (byName) {
    return byName.id;
  }
  const firstName = q.split(/\s+/)[0];
  const byFirst = members.find((m) =>
    m.name.toLowerCase().startsWith(firstName),
  );
  return byFirst?.id ?? members[0]?.id ?? "";
}

export function mapAiFlowToSteps(
  draft: import("@/lib/integrations/openai").ParsedFmsFlowDraft,
  members: { id: string; name: string; email: string }[],
): FmsFlowchartStep[] {
  return draft.steps.map((step) => ({
    id: crypto.randomUUID(),
    stepName: step.stepName,
    ownerUserId: resolveFlowOwner(step.ownerHint, members),
    howInstructions: step.howInstructions,
    tatValue: String(step.tatValue),
    tatUnit: step.tatUnit,
  }));
}

export function flowStepToTemplateStep(step: FmsFlowchartStep) {
  const tatNumber = Number(step.tatValue) || 1;
  let slaType: FmsSlaType;
  let slaConfig: FmsSlaConfig;

  if (step.tatUnit === "hours") {
    slaType = "TAT_WORKING_HOURS";
    slaConfig = { hours: tatNumber };
  } else {
    slaType = "TAT_CALENDAR_DAYS";
    slaConfig = { days: tatNumber, atHour: 18, atMinute: 0 };
  }

  return {
    stepName: step.stepName.trim(),
    defaultOwnerUserId: step.ownerUserId.trim(),
    instructions: step.howInstructions.trim(),
    roleLabel: null,
    slaType,
    slaConfig,
    allowMarkDone: true,
    allowUpload: false,
    allowNotes: true,
    captureFields: [],
  };
}

export const FMS_DESIGN_STATUS_LABELS = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
} as const;
