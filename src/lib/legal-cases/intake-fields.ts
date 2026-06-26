import type { LegalCase } from "@prisma/client";
import { sectionField } from "@/lib/legal-cases/section-data";

/** Resolve Sec 1 intake columns (handles header variants from master import). */
export function intakeField(
  legalCase: Pick<LegalCase, "sectionData">,
  ...keys: string[]
): string {
  for (const key of keys) {
    const value = sectionField(legalCase, key);
    if (value.trim()) {
      return value.trim();
    }
  }
  return "";
}

export function intakeDoa(legalCase: Pick<LegalCase, "sectionData">) {
  return intakeField(
    legalCase,
    "DATE OF ACCIDENT",
    "DATE OF ACCIDENT/ FIR",
  );
}

export function intakeFirDate(legalCase: Pick<LegalCase, "sectionData">) {
  return intakeField(legalCase, "DATE OF FIR");
}

export function intakeCrimeNo(legalCase: Pick<LegalCase, "sectionData">) {
  return intakeField(legalCase, "FIR NO.", "FIR NO");
}

export function intakeThana(legalCase: Pick<LegalCase, "sectionData">) {
  return intakeField(legalCase, "THANA");
}

export function intakeRoute(legalCase: Pick<LegalCase, "sectionData">) {
  return intakeField(legalCase, "ROUTE");
}

export function intakeDeceased(legalCase: Pick<LegalCase, "sectionData">) {
  return intakeField(
    legalCase,
    "DESEASED/INJURED",
    "DECEASED",
    "DESEASED/INJURED",
  );
}

export function intakeContact(legalCase: Pick<LegalCase, "sectionData">) {
  return intakeField(legalCase, "CONTACT NO.", "CONTACT NO");
}

export function intakeAddress(legalCase: Pick<LegalCase, "sectionData">) {
  return intakeField(legalCase, "ADDRESS");
}

export function intakeFieldStaff(legalCase: Pick<LegalCase, "sectionData">) {
  return intakeField(
    legalCase,
    "FIELD",
    "PERSON RESPONSIBLE",
  );
}

export function intakeAccidentSummary(legalCase: Pick<LegalCase, "sectionData">) {
  return intakeField(legalCase, "ACCIDENT SUMMARY");
}

export function intakeVehicleReg(legalCase: Pick<LegalCase, "sectionData">) {
  return intakeField(legalCase, "NO. REG", "VEHICLE");
}

export function intakeSeries(legalCase: Pick<LegalCase, "sectionData">) {
  return intakeField(legalCase, "SERIES");
}

export type FollowFatalExclusion =
  | "no-insurance"
  | "unknown-vehicle"
  | "lost";

export function classifyFollowFatalExclusion(
  legalCase: LegalCase,
): FollowFatalExclusion | null {
  const status = (legalCase.fileStatus ?? "").toUpperCase();
  if (status.includes("LOST")) {
    return "lost";
  }

  const company = (legalCase.company ?? "").toUpperCase();
  if (
    company.includes("NO INSURANCE") ||
    company.includes("NO POLICY") ||
    company.includes("POLICY INVALID")
  ) {
    return "no-insurance";
  }

  const firUnknown = intakeField(
    legalCase,
    "FIR UNKNOWN",
  ).toUpperCase();
  const seizure = intakeField(
    legalCase,
    "VEHICLE SEASURE",
    "VEHICLE SEIZURE",
  ).toUpperCase();
  if (
    firUnknown &&
    (firUnknown === "YES" ||
      firUnknown === "Y" ||
      firUnknown.includes("UNKNOWN")) &&
    !seizure
  ) {
    return "unknown-vehicle";
  }

  return null;
}

export function isFatalCategory(category: string | null | undefined) {
  const value = (category ?? "").trim().toUpperCase();
  return value === "F" || value === "SF" || value.includes("FATAL");
}

export function noShowMarkCount(amdCcStatus: string | null | undefined) {
  const value = (amdCcStatus ?? "").toUpperCase();
  const matches = value.match(/\b[BCDE]\b/g);
  return matches?.length ?? 0;
}

export function needsPublicationAlert(amdCcStatus: string | null | undefined) {
  return noShowMarkCount(amdCcStatus) >= 3;
}

export function parseMonthKey(value: string | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }
  const match = value.trim().match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return null;
  }
  return `${match[1]}-${match[2]}`;
}

/** Best-effort month bucket from DOA strings like 7-May-26 or 30-Apr-26. */
export function doaMonthKey(doa: string): string | null {
  const trimmed = doa.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }
  const parts = trimmed.split("-");
  if (parts.length !== 3) {
    return null;
  }
  const monthNames: Record<string, string> = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };
  const monthPart = parts[1]?.slice(0, 3).toLowerCase() ?? "";
  const month = monthNames[monthPart];
  if (!month) {
    return null;
  }
  const yearPart = parts[2]?.length === 2 ? `20${parts[2]}` : parts[2];
  return `${yearPart}-${month}`;
}

export function daysSinceDateLabel(label: string | undefined | null): number | null {
  if (!label?.trim()) {
    return null;
  }
  const parsed = new Date(label.trim());
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - parsed.getTime()) / 86_400_000);
}
