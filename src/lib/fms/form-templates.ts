import type { FmsFormFieldType } from "@prisma/client";
import {
  DEFAULT_PO_LINE_ITEM_COLUMNS,
  serializeFieldOptions,
  slugifyFieldKey,
  type FmsTableColumn,
  type FmsTableFooterTotal,
} from "@/lib/fms/constants";

export type FmsIntakeFormFieldTemplate = {
  label: string;
  fieldType: FmsFormFieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[];
  columns?: FmsTableColumn[];
  footerTotals?: FmsTableFooterTotal[];
};

const INTAKE_FORM_TEMPLATES: Record<string, FmsIntakeFormFieldTemplate[]> = {
  "purchase-order": [
    {
      label: "Vendor name",
      fieldType: "TEXT",
      required: true,
      placeholder: "Supplier or vendor name",
    },
    {
      label: "PO number",
      fieldType: "TEXT",
      placeholder: "Optional internal PO reference",
    },
    {
      label: "Expected delivery date",
      fieldType: "DATE",
      required: true,
    },
    {
      label: "Line items",
      fieldType: "TABLE",
      required: true,
      columns: DEFAULT_PO_LINE_ITEM_COLUMNS,
      footerTotals: [
        {
          key: "grand_total",
          label: "Grand total",
          columnKey: "line_total",
          decimals: 2,
        },
        {
          key: "total_quantity",
          label: "Total quantity",
          columnKey: "quantity",
          decimals: 0,
        },
      ],
      helpText: "Add each item with quantity and rate; line total calculates automatically.",
    },
    {
      label: "Notes",
      fieldType: "TEXTAREA",
      placeholder: "Delivery instructions or special terms",
    },
    {
      label: "Submission timestamp",
      fieldType: "DATETIME",
      helpText: "Filled automatically on submit",
    },
  ],
};

export function getFmsIntakeFormTemplate(workflowTemplateId: string) {
  return INTAKE_FORM_TEMPLATES[workflowTemplateId] ?? null;
}

export function intakeFormTemplateToFieldCreates(
  fields: FmsIntakeFormFieldTemplate[],
) {
  return fields.map((field, index) => ({
    sortOrder: index,
    label: field.label.trim(),
    fieldKey: slugifyFieldKey(field.label),
    fieldType: field.fieldType,
    required: Boolean(field.required),
    options: serializeFieldOptions(field.fieldType, {
      choices: field.options ?? [],
      columns: field.columns,
      footerTotals: field.footerTotals,
    }),
    placeholder: field.placeholder?.trim() || null,
    helpText: field.helpText?.trim() || null,
  }));
}

export function getIntakeFieldsForWorkflowTemplate(workflowTemplateId: string) {
  const template = getFmsIntakeFormTemplate(workflowTemplateId);
  if (!template) {
    return null;
  }
  return intakeFormTemplateToFieldCreates(template);
}

export function getIntakeFieldsForDesignName(designName: string) {
  const normalized = designName.trim().toLowerCase();
  if (normalized === "purchase order") {
    return getIntakeFieldsForWorkflowTemplate("purchase-order");
  }
  return null;
}
