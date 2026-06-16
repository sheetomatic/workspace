import type { FmsFormFieldType } from "@prisma/client";
import {
  defaultFieldWidth,
  serializeFieldOptions,
  slugifyFieldKey,
  type FmsFieldOptionsInput,
  type FmsFieldWidth,
} from "@/lib/fms/constants";
import type {
  ParsedFmsFormDraft,
  ParsedFmsFormFieldDraft,
} from "@/lib/integrations/openai";
import type { FmsFlowchartStep } from "@/lib/fms/flow-design";

function isTimestampField(field: ParsedFmsFormFieldDraft) {
  return (
    field.fieldType === "DATETIME" &&
    (/timestamp/i.test(field.label) ||
      /^(submission_)?timestamp$/i.test(slugifyFieldKey(field.label)))
  );
}

function isTitleLikeField(field: ParsedFmsFormFieldDraft) {
  const label = field.label.toLowerCase();
  const key = slugifyFieldKey(field.label);
  return (
    field.fieldType === "TEXT" &&
    (label.includes("request title") ||
      label.includes("subject") ||
      key === "request_title" ||
      key === "title")
  );
}

/** Auto-created or nearly empty forms that should be rebuilt by AI, not lightly refined. */
export function isStubFmsForm(draft: ParsedFmsFormDraft) {
  if (draft.fields.length === 0) {
    return true;
  }
  if (draft.fields.length <= 2) {
    return true;
  }
  const nonMeta = draft.fields.filter(
    (field) => !isTimestampField(field) && !isTitleLikeField(field),
  );
  return nonMeta.length === 0;
}

export function buildStubFormAiPrompt(
  draft: ParsedFmsFormDraft,
  userPrompt: string,
) {
  const parts = [
    `Build a complete intake form for: ${draft.name.trim() || "this process"}.`,
    draft.description.trim(),
    userPrompt.trim(),
  ].filter(Boolean);
  return parts.join(" ");
}

export function buildDesignIntakeAiPrompt(input: {
  name: string;
  description: string | null;
  steps: FmsFlowchartStep[];
}) {
  const stepSummary = input.steps
    .map(
      (step) =>
        `${step.stepName}${step.howInstructions ? `: ${step.howInstructions}` : ""}`,
    )
    .join("; ");
  return [
    `Design the intake form for "${input.name}".`,
    input.description?.trim(),
    stepSummary ? `Workflow steps: ${stepSummary}.` : "",
    "Include every field a submitter should fill when starting this process.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function aiFormDraftToFieldCreates(draft: ParsedFmsFormDraft) {
  return draft.fields.map((field, index) => {
    const fieldKey = slugifyFieldKey(field.label);
    const width: FmsFieldWidth = defaultFieldWidth(field.fieldType);
    let optionsInput: FmsFieldOptionsInput;

    if (field.dependsOn && field.choicesByParent) {
      optionsInput = {
        dependsOn: field.dependsOn,
        choicesByParent: field.choicesByParent,
        width,
      };
    } else if (field.options?.length) {
      optionsInput = { choices: field.options, width };
    } else {
      optionsInput = { choices: [], width };
    }

    return {
      sortOrder: index,
      label: field.label.trim(),
      fieldKey,
      fieldType: field.fieldType as FmsFormFieldType,
      required: Boolean(field.required),
      options: serializeFieldOptions(field.fieldType, optionsInput, width),
      placeholder: field.placeholder?.trim() || null,
      helpText: field.helpText?.trim() || null,
    };
  });
}
