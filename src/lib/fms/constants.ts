import type { FmsFormFieldType, FmsSlaType } from "@prisma/client";

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
