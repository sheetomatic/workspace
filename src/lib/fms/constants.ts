import type { FmsFormFieldType, FmsSlaType } from "@prisma/client";

export type FmsFieldWidth = "half" | "full";

export type FmsAlertConfig = {
  whatsappEnabled: boolean;
  onAssign: boolean;
  onDueComing: boolean;
  dueComingDaysBefore: number;
  onSameDay: boolean;
  onOverdue: boolean;
};

export const DEFAULT_FMS_ALERT_CONFIG: FmsAlertConfig = {
  whatsappEnabled: true,
  onAssign: true,
  onDueComing: true,
  dueComingDaysBefore: 1,
  onSameDay: true,
  onOverdue: true,
};

export function parseAlertConfig(raw: unknown): FmsAlertConfig {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_FMS_ALERT_CONFIG };
  }
  const record = raw as Record<string, unknown>;
  return {
    whatsappEnabled: record.whatsappEnabled !== false,
    onAssign: record.onAssign !== false,
    onDueComing: record.onDueComing !== false,
    dueComingDaysBefore:
      typeof record.dueComingDaysBefore === "number" &&
      record.dueComingDaysBefore >= 0
        ? Math.min(record.dueComingDaysBefore, 30)
        : DEFAULT_FMS_ALERT_CONFIG.dueComingDaysBefore,
    onSameDay: record.onSameDay !== false,
    onOverdue: record.onOverdue !== false,
  };
}

export type FmsFieldOptionsParsed = {
  choices: string[];
  width: FmsFieldWidth;
  dependsOn?: string;
  choicesByParent?: Record<string, string[]>;
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

export const FMS_SLA_TYPES = Object.keys(FMS_SLA_TYPE_LABELS) as FmsSlaType[];

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
  /** India MSME default: skip Sunday only (MonùSat working). */
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
    return { choices, width, dependsOn, choicesByParent };
  }
  return { choices: [], width: "full" };
}

export type FmsFieldOptionsInput = {
  choices?: string[];
  width?: FmsFieldWidth;
  dependsOn?: string;
  choicesByParent?: Record<string, string[]>;
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
