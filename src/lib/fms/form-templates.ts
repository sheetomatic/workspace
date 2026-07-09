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

const SO_LINE_ITEM_COLUMNS: FmsTableColumn[] = [
  {
    key: "item_name",
    label: "Item / service",
    columnType: "TEXT",
    required: true,
  },
  {
    key: "quantity",
    label: "Quantity",
    columnType: "NUMBER",
    required: true,
  },
  {
    key: "rate",
    label: "Rate",
    columnType: "NUMBER",
    required: true,
  },
  {
    key: "line_total",
    label: "Line total",
    columnType: "CALCULATED",
    formula: {
      operation: "MULTIPLY",
      operandKeys: ["quantity", "rate"],
      decimals: 2,
    },
  },
];

const INTAKE_FORM_TEMPLATES: Record<string, FmsIntakeFormFieldTemplate[]> = {
  "sales-order": [
    {
      label: "Customer name",
      fieldType: "TEXT",
      required: true,
    },
    {
      label: "Phone",
      fieldType: "PHONE",
    },
    {
      label: "Email",
      fieldType: "EMAIL",
    },
    {
      label: "Delivery address",
      fieldType: "TEXTAREA",
      required: true,
    },
    {
      label: "Quotation number",
      fieldType: "TEXT",
      required: true,
    },
    {
      label: "Customer PO",
      fieldType: "TEXT",
      placeholder: "Customer purchase order reference",
    },
    {
      label: "Delivery date",
      fieldType: "DATE",
      required: true,
    },
    {
      label: "Payment terms",
      fieldType: "TEXT",
    },
    {
      label: "Line items",
      fieldType: "TABLE",
      required: true,
      columns: SO_LINE_ITEM_COLUMNS,
      footerTotals: [
        {
          key: "grand_total",
          label: "Grand total",
          columnKey: "line_total",
          decimals: 2,
        },
      ],
    },
    {
      label: "Advance received",
      fieldType: "NUMBER",
    },
    {
      label: "Balance due",
      fieldType: "NUMBER",
    },
  ],
  "stock-check-fulfillment": [
    {
      label: "Sales order number",
      fieldType: "TEXT",
      required: true,
    },
    {
      label: "Delivery date",
      fieldType: "DATE",
      required: true,
    },
  ],
  "dispatch-to-delivery": [
    {
      label: "Sales order number",
      fieldType: "TEXT",
      required: true,
    },
    {
      label: "Customer name",
      fieldType: "TEXT",
      required: true,
    },
    {
      label: "Delivery address",
      fieldType: "TEXTAREA",
      required: true,
    },
  ],
  recruitment: [
    {
      label: "Position",
      fieldType: "TEXT",
      required: true,
      placeholder: "e.g. Production Supervisor",
    },
    {
      label: "Department",
      fieldType: "TEXT",
      required: true,
    },
    {
      label: "Candidate name",
      fieldType: "TEXT",
      placeholder: "Fill once a candidate is identified",
    },
    {
      label: "Candidate phone",
      fieldType: "PHONE",
    },
    {
      label: "Candidate email",
      fieldType: "EMAIL",
    },
    {
      label: "Source",
      fieldType: "ENUM",
      options: ["Job portal", "Referral", "Consultant", "Walk-in", "Other"],
    },
    {
      label: "Expected CTC",
      fieldType: "NUMBER",
    },
    {
      label: "Target joining date",
      fieldType: "DATE",
    },
    {
      label: "Notes",
      fieldType: "TEXTAREA",
      placeholder: "JD highlights, must-have skills",
    },
  ],
  "purchase-order": [
    {
      label: "Sales Order #",
      fieldType: "TEXT",
      placeholder: "Linked sales order number",
    },
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
  if (normalized === "sales order") {
    return getIntakeFieldsForWorkflowTemplate("sales-order");
  }
  if (normalized === "stock check fulfillment") {
    return getIntakeFieldsForWorkflowTemplate("stock-check-fulfillment");
  }
  if (normalized === "dispatch to delivery") {
    return getIntakeFieldsForWorkflowTemplate("dispatch-to-delivery");
  }
  return null;
}
