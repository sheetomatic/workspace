import type { FmsFormFieldType, FmsSlaType } from "@prisma/client";

export type FmsFieldWidth = "half" | "full";

export type FmsTableColumnType = "TEXT" | "NUMBER" | "ENUM" | "CALCULATED";

export type FmsTableFormulaOp =
  | "MULTIPLY"
  | "ADD"
  | "SUBTRACT"
  | "DIVIDE"
  | "SUM";

export type FmsTableColumnFormula = {
  operation: FmsTableFormulaOp;
  operandKeys: string[];
  decimals?: number;
};

export type FmsTableFooterTotal = {
  key: string;
  label: string;
  columnKey: string;
  decimals?: number;
};

export type FmsTableColumn = {
  key: string;
  label: string;
  columnType: FmsTableColumnType;
  required?: boolean;
  choices?: string[];
  formula?: FmsTableColumnFormula;
};

export type FmsTableRow = Record<string, string>;

export type FmsPlanMode = "AUTO_TAT_ALL" | "ON_PREV_ACTUAL";

export type FmsAlertConfig = {
  whatsappEnabled: boolean;
  emailEnabled: boolean;
  onAssign: boolean;
  onDueComing: boolean;
  dueComingDaysBefore: number;
  onSameDay: boolean;
  onOverdue: boolean;
  planMode: FmsPlanMode;
};

export const DEFAULT_FMS_ALERT_CONFIG: FmsAlertConfig = {
  whatsappEnabled: true,
  emailEnabled: true,
  onAssign: true,
  onDueComing: true,
  dueComingDaysBefore: 1,
  onSameDay: true,
  onOverdue: true,
  planMode: "AUTO_TAT_ALL",
};

export function parseAlertConfig(raw: unknown): FmsAlertConfig {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_FMS_ALERT_CONFIG };
  }
  const record = raw as Record<string, unknown>;
  return {
    whatsappEnabled: record.whatsappEnabled !== false,
    emailEnabled: record.emailEnabled !== false,
    onAssign: record.onAssign !== false,
    onDueComing: record.onDueComing !== false,
    dueComingDaysBefore:
      typeof record.dueComingDaysBefore === "number" &&
      record.dueComingDaysBefore >= 0
        ? Math.min(record.dueComingDaysBefore, 30)
        : DEFAULT_FMS_ALERT_CONFIG.dueComingDaysBefore,
    onSameDay: record.onSameDay !== false,
    onOverdue: record.onOverdue !== false,
    planMode:
      record.planMode === "ON_PREV_ACTUAL" ? "ON_PREV_ACTUAL" : "AUTO_TAT_ALL",
  };
}

export type FmsFieldOptionsParsed = {
  choices: string[];
  width: FmsFieldWidth;
  dependsOn?: string;
  choicesByParent?: Record<string, string[]>;
  columns?: FmsTableColumn[];
  footerTotals?: FmsTableFooterTotal[];
};

export const FMS_HALF_WIDTH_FIELD_TYPES: FmsFormFieldType[] = [
  "TEXT",
  "EMAIL",
  "PHONE",
  "NUMBER",
  "DATE",
  "DATETIME",
  "ENUM",
];

export const FMS_FIELD_TYPE_LABELS: Record<FmsFormFieldType, string> = {
  TEXT: "Text",
  TEXTAREA: "Long text",
  NUMBER: "Number",
  ENUM: "Single choice",
  ENUM_LIST: "Multiple choice",
  DATE: "Date",
  DATETIME: "Date & time",
  EMAIL: "Email",
  PHONE: "Phone",
  FILE: "File upload",
  TABLE: "Line items table",
};

export const FMS_SLA_TYPE_LABELS: Record<FmsSlaType, string> = {
  NONE: "No auto planned date",
  TAT_CALENDAR_DAYS: "TAT (working days)",
  TAT_WORKING_HOURS: "TAT (working hours)",
  SPECIFIC_TIME: "Specific time of day",
  LEAD_TIME_MINUS: "Days before deadline",
};

export const FMS_FIELD_TYPES = Object.keys(
  FMS_FIELD_TYPE_LABELS,
) as FmsFormFieldType[];

/** Form builder + submit UI (file upload not supported yet). */
export const FMS_FORM_FIELD_TYPES = FMS_FIELD_TYPES.filter(
  (type) => type !== "FILE",
);

export const FMS_SLA_TYPES = Object.keys(FMS_SLA_TYPE_LABELS) as FmsSlaType[];

export const DEFAULT_PO_LINE_ITEM_COLUMNS: FmsTableColumn[] = [
  {
    key: "item_name",
    label: "Item name",
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
  {
    key: "uom",
    label: "UOM",
    columnType: "ENUM",
    required: true,
    choices: ["Pcs", "Kg", "Ltr", "Mtr", "Box", "Set"],
  },
  {
    key: "size",
    label: "Size",
    columnType: "TEXT",
  },
  {
    key: "color",
    label: "Color",
    columnType: "ENUM",
    choices: ["Red", "Blue", "Green", "Black", "White", "Other"],
  },
];

export const FMS_DEFAULT_TABLE_FIELD_LABEL = "Line items";

export const FMS_DEFAULT_TABLE_FOOTER_TOTALS: FmsTableFooterTotal[] = [
  {
    key: "grand_total",
    label: "Grand total",
    columnKey: "line_total",
    decimals: 2,
  },
];

const GENERIC_NON_TABLE_FIELD_LABELS = new Set([
  "Short text",
  "Long text",
  "Email",
  "Phone number",
  "Number",
  "Single choice",
  "Multiple choice",
  "Date",
  "Date & time",
  "File upload",
  "New field",
]);

/** Use when loading or switching to TABLE so label matches the field type. */
export function normalizeTableFieldLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed || GENERIC_NON_TABLE_FIELD_LABELS.has(trimmed)) {
    return FMS_DEFAULT_TABLE_FIELD_LABEL;
  }
  return trimmed;
}

/** Merge saved columns with PO defaults so Rate / Line total appear on older forms. */
export function mergeTableColumnsWithDefaults(
  columns: FmsTableColumn[],
): FmsTableColumn[] {
  if (!columns.length) {
    return DEFAULT_PO_LINE_ITEM_COLUMNS.map((column) => ({ ...column }));
  }
  const byKey = new Map(columns.map((column) => [column.key, column]));
  const defaultKeys = DEFAULT_PO_LINE_ITEM_COLUMNS.map((column) => column.key);
  const merged: FmsTableColumn[] = DEFAULT_PO_LINE_ITEM_COLUMNS.map(
    (defaultColumn) => {
      const saved = byKey.get(defaultColumn.key);
      return saved ? { ...saved } : { ...defaultColumn };
    },
  );
  for (const column of columns) {
    if (!defaultKeys.includes(column.key)) {
      merged.push({ ...column });
    }
  }
  return merged;
}

export function defaultTableFooterTotals(
  footerTotals: FmsTableFooterTotal[],
): FmsTableFooterTotal[] {
  if (footerTotals.length) {
    return footerTotals.map((total) => ({ ...total }));
  }
  return FMS_DEFAULT_TABLE_FOOTER_TOTALS.map((total) => ({ ...total }));
}

export function isTableFieldType(fieldType: FmsFormFieldType) {
  return fieldType === "TABLE";
}

export function normalizeTableColumn(raw: unknown): FmsTableColumn | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const label =
    typeof record.label === "string" && record.label.trim()
      ? record.label.trim()
      : "";
  if (!label) {
    return null;
  }
  const key =
    typeof record.key === "string" && record.key.trim()
      ? record.key.trim()
      : slugifyFieldKey(label);
  const columnType =
    record.columnType === "NUMBER" ||
    record.columnType === "ENUM" ||
    record.columnType === "CALCULATED"
      ? record.columnType
      : "TEXT";
  const choices = Array.isArray(record.choices)
    ? record.choices.map(String).map((choice) => choice.trim()).filter(Boolean)
    : undefined;
  let formula: FmsTableColumnFormula | undefined;
  if (record.formula && typeof record.formula === "object") {
    const formulaRecord = record.formula as Record<string, unknown>;
    const operation = formulaRecord.operation;
    const operandKeys = Array.isArray(formulaRecord.operandKeys)
      ? formulaRecord.operandKeys.map(String).filter(Boolean)
      : [];
    if (
      (operation === "MULTIPLY" ||
        operation === "ADD" ||
        operation === "SUBTRACT" ||
        operation === "DIVIDE" ||
        operation === "SUM") &&
      operandKeys.length >= 2
    ) {
      formula = {
        operation,
        operandKeys,
        decimals:
          typeof formulaRecord.decimals === "number"
            ? Math.min(Math.max(formulaRecord.decimals, 0), 4)
            : 2,
      };
    }
  }
  return {
    key,
    label,
    columnType,
    required: Boolean(record.required),
    ...(choices?.length ? { choices } : {}),
    ...(formula ? { formula } : {}),
  };
}

export function parseTableColumns(options: unknown): FmsTableColumn[] {
  const parsed = parseFieldOptions(options);
  if (parsed.columns?.length) {
    return parsed.columns;
  }
  return [];
}

export function parseTableFooterTotals(options: unknown): FmsTableFooterTotal[] {
  const parsed = parseFieldOptions(options);
  return parsed.footerTotals ?? [];
}

export function newTableColumn(): FmsTableColumn {
  return {
    key: `column_${crypto.randomUUID().slice(0, 8)}`,
    label: "New column",
    columnType: "TEXT",
    required: false,
  };
}

export function updateTableColumn(
  columns: FmsTableColumn[],
  index: number,
  patch: Partial<FmsTableColumn>,
): FmsTableColumn[] {
  return columns.map((column, columnIndex) => {
    if (columnIndex !== index) {
      return column;
    }
    const next = { ...column, ...patch };
    if (patch.label && !patch.key) {
      next.key = slugifyFieldKey(patch.label);
    }
    if (next.columnType === "ENUM") {
      if (!next.choices?.length) {
        delete next.choices;
      }
    } else {
      delete next.choices;
    }
    if (next.columnType === "CALCULATED") {
      if (!next.formula?.operandKeys?.length) {
        next.formula = {
          operation: "MULTIPLY",
          operandKeys: [],
          decimals: 2,
        };
      }
      next.required = false;
    } else {
      delete next.formula;
    }
    return next;
  });
}

export function removeTableColumnAt(
  columns: FmsTableColumn[],
  index: number,
): FmsTableColumn[] {
  if (columns.length <= 1) {
    return columns;
  }
  const removed = columns[index];
  const next = columns.filter((_, columnIndex) => columnIndex !== index);
  if (!removed) {
    return next;
  }
  // Drop the deleted column from any calculated formula so it does not leave a
  // dangling operand reference that silently breaks the calculation.
  return next.map((column) => {
    if (!isCalculatedTableColumn(column) || !column.formula) {
      return column;
    }
    if (!column.formula.operandKeys.includes(removed.key)) {
      return column;
    }
    return {
      ...column,
      formula: {
        ...column.formula,
        operandKeys: column.formula.operandKeys.filter(
          (key) => key !== removed.key,
        ),
      },
    };
  });
}

/** Footer totals that point at a removed column key must be dropped too. */
export function pruneFooterTotalsForColumns(
  footerTotals: FmsTableFooterTotal[],
  columns: FmsTableColumn[],
): FmsTableFooterTotal[] {
  const validKeys = new Set(columns.map((column) => column.key));
  return footerTotals.filter((total) => validKeys.has(total.columnKey));
}

export function moveTableColumn(
  columns: FmsTableColumn[],
  index: number,
  direction: "left" | "right",
): FmsTableColumn[] {
  const targetIndex = direction === "left" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= columns.length) {
    return columns;
  }
  const next = [...columns];
  const [moved] = next.splice(index, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

export function resolveTableColumns(columns: FmsTableColumn[]) {
  return columns.length ? columns : DEFAULT_PO_LINE_ITEM_COLUMNS;
}

/** Dropdown choices for a table column - uses saved choices or sensible defaults by label. */
export function resolveTableColumnChoices(column: FmsTableColumn): string[] {
  if (column.choices?.length) {
    return column.choices;
  }
  if (column.columnType !== "ENUM") {
    return [];
  }
  const hint = `${column.key} ${column.label}`.toLowerCase();
  if (hint.includes("uom") || hint.includes("unit")) {
    return ["Pcs", "Kg", "Ltr", "Mtr", "Box", "Set"];
  }
  if (hint.includes("color") || hint.includes("colour")) {
    return ["Red", "Blue", "Green", "Black", "White", "Other"];
  }
  if (hint.includes("size")) {
    return ["XS", "S", "M", "L", "XL", "XXL", "Free"];
  }
  return [];
}

export function tableColumnUsesSelect(column: FmsTableColumn) {
  return (
    column.columnType === "ENUM" ||
    resolveTableColumnChoices(column).length > 0
  );
}

export function isCalculatedTableColumn(column: FmsTableColumn) {
  return column.columnType === "CALCULATED";
}

export function newTableFooterTotal(): FmsTableFooterTotal {
  return {
    key: `total_${crypto.randomUUID().slice(0, 8)}`,
    label: "Grand total",
    columnKey: "",
    decimals: 2,
  };
}

export function normalizeTableFooterTotal(raw: unknown): FmsTableFooterTotal | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const label =
    typeof record.label === "string" && record.label.trim()
      ? record.label.trim()
      : "";
  const columnKey =
    typeof record.columnKey === "string" && record.columnKey.trim()
      ? record.columnKey.trim()
      : "";
  if (!label || !columnKey) {
    return null;
  }
  const key =
    typeof record.key === "string" && record.key.trim()
      ? record.key.trim()
      : slugifyFieldKey(label);
  return {
    key,
    label,
    columnKey,
    decimals:
      typeof record.decimals === "number"
        ? Math.min(Math.max(record.decimals, 0), 4)
        : 2,
  };
}

export function isTableRowArray(value: unknown): value is FmsTableRow[] {
  return (
    Array.isArray(value) &&
    value.every(
      (row) => row && typeof row === "object" && !Array.isArray(row),
    )
  );
}

export function emptyTableRow(columns: FmsTableColumn[]): FmsTableRow {
  const row: FmsTableRow = {};
  for (const column of columns) {
    row[column.key] = "";
  }
  return row;
}

export function validateTableFieldValue(
  value: unknown,
  columns: FmsTableColumn[],
  required: boolean,
): string | null {
  if (!columns.length) {
    return "Table has no columns configured.";
  }
  if (!isTableRowArray(value) || value.length === 0) {
    return required ? "Add at least one row." : null;
  }

  const inputColumns = columns.filter((column) => !isCalculatedTableColumn(column));

  for (let rowIndex = 0; rowIndex < value.length; rowIndex += 1) {
    const row = value[rowIndex];
    const hasAnyValue = inputColumns.some((column) =>
      String(row[column.key] ?? "").trim(),
    );
    if (!hasAnyValue) {
      if (value.length === 1 && !required) {
        continue;
      }
      return `Row ${rowIndex + 1} is empty.`;
    }

    for (const column of inputColumns) {
      const cell = String(row[column.key] ?? "").trim();
      if (column.required && !cell) {
        return `Row ${rowIndex + 1}: ${column.label} is required.`;
      }
      if (
        column.columnType === "ENUM" &&
        cell &&
        column.choices?.length &&
        !column.choices.includes(cell)
      ) {
        return `Row ${rowIndex + 1}: invalid ${column.label}.`;
      }
      if (column.columnType === "NUMBER" && cell && Number.isNaN(Number(cell))) {
        return `Row ${rowIndex + 1}: ${column.label} must be a number.`;
      }
    }
  }

  const meaningfulRows = value.filter((row) =>
    inputColumns.some((column) => String(row[column.key] ?? "").trim()),
  );
  if (required && meaningfulRows.length === 0) {
    return "Add at least one row.";
  }

  return null;
}

export function formatTableSummary(
  value: unknown,
  columns: FmsTableColumn[],
): string {
  if (!isTableRowArray(value) || columns.length === 0) {
    return "-";
  }
  const rows = value.filter((row) =>
    columns.some((column) => String(row[column.key] ?? "").trim()),
  );
  if (rows.length === 0) {
    return "-";
  }
  const primary = columns[0];
  const labels = rows
    .map((row) => String(row[primary.key] ?? "").trim())
    .filter(Boolean);
  if (labels.length === 0) {
    return `${rows.length} row${rows.length === 1 ? "" : "s"}`;
  }
  if (labels.length <= 2) {
    return labels.join(", ");
  }
  return `${labels.slice(0, 2).join(", ")} +${labels.length - 2} more`;
}

export function slugifyFieldKey(label: string) {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48) || "field";
}

export type FmsCaptureField = {
  key: string;
  label: string;
  type: "TEXT" | "NUMBER" | "DATE" | "DATETIME";
  required?: boolean;
};

export type FmsSlaConfig = {
  days?: number;
  hours?: number;
  atHour?: number;
  atMinute?: number;
  minusDays?: number;
};

export type FmsWorkingDaysConfig = {
  /** India MSME default: skip Sunday only (Mon-Sat working). */
  skipSaturday?: boolean;
  holidayDates?: string[];
};

export function isHalfWidthFieldType(fieldType: FmsFormFieldType) {
  return FMS_HALF_WIDTH_FIELD_TYPES.includes(fieldType);
}

export function defaultFieldWidth(fieldType: FmsFormFieldType): FmsFieldWidth {
  return isHalfWidthFieldType(fieldType) ? "half" : "full";
}

export function parseFieldOptions(options: unknown): FmsFieldOptionsParsed {
  if (Array.isArray(options)) {
    return { choices: options.map(String).filter(Boolean), width: "full" };
  }
  if (options && typeof options === "object") {
    const record = options as Record<string, unknown>;
    const choices = Array.isArray(record.choices)
      ? record.choices.map(String).filter(Boolean)
      : [];
    const width = record.width === "half" ? "half" : "full";
    const dependsOn =
      typeof record.dependsOn === "string" && record.dependsOn.trim()
        ? record.dependsOn.trim()
        : undefined;
    let choicesByParent: Record<string, string[]> | undefined;
    if (record.choicesByParent && typeof record.choicesByParent === "object") {
      choicesByParent = {};
      for (const [key, value] of Object.entries(
        record.choicesByParent as Record<string, unknown>,
      )) {
        if (Array.isArray(value)) {
          choicesByParent[key] = value.map(String).filter(Boolean);
        }
      }
      if (Object.keys(choicesByParent).length === 0) {
        choicesByParent = undefined;
      }
    }
    let columns: FmsTableColumn[] | undefined;
    if (Array.isArray(record.columns)) {
      columns = record.columns
        .map((column) => normalizeTableColumn(column))
        .filter((column): column is FmsTableColumn => column !== null);
      if (columns.length === 0) {
        columns = undefined;
      }
    }
    let footerTotals: FmsTableFooterTotal[] | undefined;
    if (Array.isArray(record.footerTotals)) {
      footerTotals = record.footerTotals
        .map((total) => normalizeTableFooterTotal(total))
        .filter((total): total is FmsTableFooterTotal => total !== null);
      if (footerTotals.length === 0) {
        footerTotals = undefined;
      }
    }
    return { choices, width, dependsOn, choicesByParent, columns, footerTotals };
  }
  return { choices: [], width: "full" };
}

export type FmsFieldOptionsInput = {
  choices?: string[];
  width?: FmsFieldWidth;
  dependsOn?: string;
  choicesByParent?: Record<string, string[]>;
  columns?: FmsTableColumn[];
  footerTotals?: FmsTableFooterTotal[];
};

export function serializeFieldOptions(
  fieldType: FmsFormFieldType,
  input: FmsFieldOptionsInput | string[],
  widthOverride?: FmsFieldWidth,
) {
  const isEnum = fieldType === "ENUM" || fieldType === "ENUM_LIST";
  const inputObj: FmsFieldOptionsInput = Array.isArray(input)
    ? { choices: input, width: widthOverride ?? "full" }
    : input;
  const choices = inputObj.choices ?? [];
  const width = inputObj.width ?? widthOverride ?? "full";
  const dependsOn = inputObj.dependsOn?.trim();
  const choicesByParent = inputObj.choicesByParent;
  const columns = inputObj.columns;
  const footerTotals = inputObj.footerTotals;

  if (fieldType === "TABLE") {
    return {
      columns: columns?.length ? columns : DEFAULT_PO_LINE_ITEM_COLUMNS,
      ...(footerTotals?.length ? { footerTotals } : {}),
    };
  }

  if (isEnum) {
    const hasDependency = Boolean(dependsOn && choicesByParent);
    if (hasDependency || width === "half") {
      return {
        ...(choices.length > 0 ? { choices } : {}),
        ...(width === "half" ? { width: "half" as const } : {}),
        ...(dependsOn ? { dependsOn } : {}),
        ...(choicesByParent ? { choicesByParent } : {}),
      };
    }
    if (dependsOn && choicesByParent) {
      return { dependsOn, choicesByParent };
    }
    return choices;
  }
  if (width === "half") {
    return { width: "half" };
  }
  return [];
}

export function parseHolidayDates(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(
    (value): value is string =>
      typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value),
  );
}

export function isTimestampField(field: {
  fieldKey: string;
  label: string;
  fieldType: FmsFormFieldType;
}) {
  if (field.fieldType !== "DATETIME") {
    return false;
  }
  if (/timestamp/i.test(field.label)) {
    return true;
  }
  return /^(submission_)?timestamp$/i.test(field.fieldKey);
}

export function applySubmissionTimestamp(
  values: Record<string, unknown>,
  fields: { fieldKey: string; label: string; fieldType: FmsFormFieldType }[],
) {
  const now = new Date().toISOString();
  const next = { ...values };
  for (const field of fields) {
    if (isTimestampField(field)) {
      next[field.fieldKey] = now;
    }
  }
  return next;
}
