import type { FmsCaptureField } from "@/lib/fms/constants";

const CAPTURE_TYPES: FmsCaptureField["type"][] = [
  "TEXT",
  "NUMBER",
  "DATE",
  "DATETIME",
  "ENUM",
];

export function parseCaptureFields(raw: unknown): FmsCaptureField[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const field = item as Record<string, unknown>;
    const key = typeof field.key === "string" ? field.key.trim() : "";
    const label = typeof field.label === "string" ? field.label.trim() : "";
    const type = CAPTURE_TYPES.includes(field.type as FmsCaptureField["type"])
      ? (field.type as FmsCaptureField["type"])
      : "TEXT";
    if (!key || !label) {
      return [];
    }
    const choices = Array.isArray(field.choices)
      ? field.choices.map((choice) => String(choice).trim()).filter(Boolean)
      : [];
    return [
      {
        key,
        label,
        type,
        required: Boolean(field.required),
        ...(type === "ENUM" && choices.length > 0 ? { choices } : {}),
      } satisfies FmsCaptureField,
    ];
  });
}

function isEmptyValue(value: unknown) {
  if (value === undefined || value === null) {
    return true;
  }
  if (typeof value === "string") {
    return !value.trim();
  }
  return false;
}

export function validateCaptureFields(
  fields: FmsCaptureField[],
  values: Record<string, unknown>,
): { ok: true } | { ok: false; message: string } {
  for (const field of fields) {
    if (!field.required) {
      continue;
    }
    const value = values[field.key];
    if (isEmptyValue(value)) {
      return { ok: false, message: `${field.label} is required.` };
    }
  }
  return { ok: true };
}
