import type { MetricTone, Role } from "@prisma/client";

const ROLE_VALUES: Role[] = [
  "VIEWER",
  "STAFF",
  "MANAGER",
  "ADMIN",
  "OWNER",
];

const TONE_VALUES: MetricTone[] = ["DEFAULT", "WARNING", "SUCCESS"];

export function parseSheetRole(value: string | undefined, fallback: Role): Role {
  const normalized = (value ?? "").trim().toUpperCase().replace(/\s+/g, "_");
  if (ROLE_VALUES.includes(normalized as Role)) {
    return normalized as Role;
  }
  return fallback;
}

export function parseSheetTone(
  value: string | undefined,
  fallback: MetricTone = "DEFAULT",
): MetricTone {
  const normalized = (value ?? "").trim().toUpperCase();
  if (TONE_VALUES.includes(normalized as MetricTone)) {
    return normalized as MetricTone;
  }
  return fallback;
}

export function parseSheetInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt((value ?? "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseSheetDate(value: string | undefined): Date | null {
  const raw = (value ?? "").trim();
  if (!raw) {
    return null;
  }

  if (/^today$/i.test(raw)) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  }

  const serial = Number(raw);
  if (Number.isFinite(serial) && serial > 20000 && serial < 100000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const ms = excelEpoch.getTime() + serial * 86400000;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) {
      return d;
    }
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]) - 1;
    let year = Number(dmy[3]);
    if (year < 100) {
      year += 2000;
    }
    const d = new Date(year, month, day, 12, 0, 0, 0);
    if (!Number.isNaN(d.getTime())) {
      return d;
    }
  }

  return null;
}

export function isEmptySheetRow(cells: (string | undefined)[]) {
  return cells.every((cell) => !(cell ?? "").trim());
}

export function cellAt(row: string[], index: number) {
  return row[index]?.trim() ?? "";
}
