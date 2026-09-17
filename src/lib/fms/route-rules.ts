import { parseFieldOptions } from "@/lib/fms/constants";

export const MAX_FMS_STEP_VISITS = 5;

export type FmsRouteSource = "completion" | "intake";
export type FmsRouteOp = "eq" | "in" | "truthy";
export type FmsRouteAction = "goto" | "skip" | "complete_job";

export type FmsRouteRule = {
  when: {
    source: FmsRouteSource;
    fieldKey: string;
    op: FmsRouteOp;
    value?: string | string[];
  };
  then: {
    action: FmsRouteAction;
    stepId?: string;
  };
};

export type FmsRouteFieldOption = {
  fieldKey: string;
  label: string;
  choices?: string[];
};

export type FmsAdvancePlan =
  | { kind: "activate"; stepId: string; skipStepIds: string[] }
  | { kind: "complete_job"; skipStepIds: string[] };

const SOURCES: FmsRouteSource[] = ["completion", "intake"];
const OPS: FmsRouteOp[] = ["eq", "in", "truthy"];
const ACTIONS: FmsRouteAction[] = ["goto", "skip", "complete_job"];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function parseStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function parseRouteRules(raw: unknown): FmsRouteRule[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const rules: FmsRouteRule[] = [];
  for (const item of raw) {
    const record = asRecord(item);
    const when = asRecord(record?.when);
    const then = asRecord(record?.then);
    if (!when || !then) {
      continue;
    }
    const source = when.source;
    const op = when.op;
    const action = then.action;
    const fieldKey =
      typeof when.fieldKey === "string" ? when.fieldKey.trim() : "";
    if (
      !SOURCES.includes(source as FmsRouteSource) ||
      !OPS.includes(op as FmsRouteOp) ||
      !ACTIONS.includes(action as FmsRouteAction) ||
      !fieldKey
    ) {
      continue;
    }
    const stepId =
      typeof then.stepId === "string" && then.stepId.trim()
        ? then.stepId.trim()
        : undefined;
    if ((action === "goto" || action === "skip") && !stepId) {
      continue;
    }
    const value =
      op === "in"
        ? parseStringList(when.value)
        : typeof when.value === "string"
          ? when.value
          : when.value == null
            ? undefined
            : String(when.value);
    rules.push({
      when: {
        source: source as FmsRouteSource,
        fieldKey,
        op: op as FmsRouteOp,
        value,
      },
      then: {
        action: action as FmsRouteAction,
        stepId,
      },
    });
  }
  return rules;
}

export function comparableFmsValue(value: unknown): string {
  if (value === true) {
    return "true";
  }
  if (value === false) {
    return "false";
  }
  if (value == null) {
    return "";
  }
  return String(value).trim().toLowerCase();
}

function readFieldValue(
  source: FmsRouteSource,
  fieldKey: string,
  values: {
    completion: Record<string, unknown>;
    intake: Record<string, unknown>;
  },
) {
  const bag = source === "intake" ? values.intake : values.completion;
  return bag[fieldKey];
}

export function routeRuleMatches(
  rule: FmsRouteRule,
  values: {
    completion: Record<string, unknown>;
    intake: Record<string, unknown>;
  },
): boolean {
  const raw = readFieldValue(rule.when.source, rule.when.fieldKey, values);
  if (rule.when.op === "truthy") {
    if (raw === false || raw === 0) {
      return false;
    }
    return comparableFmsValue(raw).length > 0;
  }
  const actual = comparableFmsValue(raw);
  if (rule.when.op === "in") {
    const options = parseStringList(rule.when.value).map((item) =>
      item.toLowerCase(),
    );
    return options.includes(actual);
  }
  return actual === comparableFmsValue(rule.when.value);
}

export function firstMatchingRouteRule(
  rules: FmsRouteRule[],
  values: {
    completion: Record<string, unknown>;
    intake: Record<string, unknown>;
  },
): FmsRouteRule | null {
  return rules.find((rule) => routeRuleMatches(rule, values)) ?? null;
}

function linearFallback(
  steps: { id: string }[],
  currentIndex: number,
): FmsAdvancePlan {
  const next = steps[currentIndex + 1];
  if (next) {
    return { kind: "activate", stepId: next.id, skipStepIds: [] };
  }
  return { kind: "complete_job", skipStepIds: [] };
}

/**
 * Decide the next stop after completing `currentStepId`.
 * Unknown stepIds (including another tenant's ids) fall back to sortOrder + 1.
 */
export function planFmsAdvance(params: {
  steps: { id: string }[];
  currentStepId: string;
  rule: FmsRouteRule | null;
}): FmsAdvancePlan {
  const currentIndex = params.steps.findIndex(
    (step) => step.id === params.currentStepId,
  );
  if (currentIndex < 0) {
    return { kind: "complete_job", skipStepIds: [] };
  }

  if (!params.rule) {
    return linearFallback(params.steps, currentIndex);
  }

  if (params.rule.then.action === "complete_job") {
    return {
      kind: "complete_job",
      skipStepIds: params.steps.slice(currentIndex + 1).map((step) => step.id),
    };
  }

  if (params.rule.then.action === "skip") {
    const skipId = params.rule.then.stepId;
    if (!skipId || !params.steps.some((step) => step.id === skipId)) {
      return linearFallback(params.steps, currentIndex);
    }
    const skipIndex = params.steps.findIndex((step) => step.id === skipId);
    const after = params.steps[skipIndex + 1];
    if (after) {
      return { kind: "activate", stepId: after.id, skipStepIds: [skipId] };
    }
    return { kind: "complete_job", skipStepIds: [skipId] };
  }

  const targetId = params.rule.then.stepId;
  const targetIndex = targetId
    ? params.steps.findIndex((step) => step.id === targetId)
    : -1;
  if (!targetId || targetIndex < 0) {
    return linearFallback(params.steps, currentIndex);
  }

  const skipStepIds: string[] = [];
  if (targetIndex > currentIndex + 1) {
    for (let index = currentIndex + 1; index < targetIndex; index += 1) {
      skipStepIds.push(params.steps[index]!.id);
    }
  }
  return { kind: "activate", stepId: targetId, skipStepIds };
}

export function latestFmsVisitByStepId<
  T extends { stepId: string; visitIndex: number },
>(states: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const state of states) {
    const prev = map.get(state.stepId);
    if (!prev || state.visitIndex >= prev.visitIndex) {
      map.set(state.stepId, state);
    }
  }
  return map;
}

export function pendingVisitForStep<
  T extends { stepId: string; status: string },
>(states: T[], stepId: string): T | undefined {
  return states.find(
    (state) => state.stepId === stepId && state.status === "PENDING",
  );
}

export function visitCountForStep<T extends { stepId: string }>(
  states: T[],
  stepId: string,
): number {
  return states.filter((state) => state.stepId === stepId).length;
}

export function nextVisitIndexForStep<T extends { stepId: string; visitIndex: number }>(
  states: T[],
  stepId: string,
): number {
  const visits = states.filter((state) => state.stepId === stepId);
  if (visits.length === 0) {
    return 0;
  }
  return Math.max(...visits.map((state) => state.visitIndex)) + 1;
}

export function summarizeRouteRule(
  rule: FmsRouteRule,
  steps: { id: string; stepName: string }[],
): string {
  const target = rule.then.stepId
    ? steps.find((step) => step.id === rule.then.stepId)?.stepName.trim() ||
      "another step"
    : "job complete";
  if (rule.then.action === "complete_job") {
    return `If ${rule.when.fieldKey} → finish job`;
  }
  if (rule.then.action === "skip") {
    return `If ${rule.when.fieldKey} → skip ${target}`;
  }
  return `If ${rule.when.fieldKey} → ${target}`;
}

export function intakeFieldsFromFormFields(
  fields: Array<{
    fieldKey: string;
    label: string;
    fieldType?: string;
    options?: unknown;
  }>,
): FmsRouteFieldOption[] {
  return fields.map((field) => ({
    fieldKey: field.fieldKey,
    label: field.label,
    choices:
      field.fieldType === "ENUM" || field.fieldType === "ENUM_LIST"
        ? parseFieldOptions(field.options).choices
        : undefined,
  }));
}
