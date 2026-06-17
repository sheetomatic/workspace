import type { FmsCaptureField } from "@/lib/fms/constants";

export function parseCaptureFields(raw: unknown): FmsCaptureField[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(
    (field): field is FmsCaptureField =>
      Boolean(field) &&
      typeof field === "object" &&
      typeof (field as FmsCaptureField).key === "string" &&
      typeof (field as FmsCaptureField).label === "string",
  );
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
