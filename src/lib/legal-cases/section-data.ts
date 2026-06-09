import type { LegalCase } from "@prisma/client";

export type SectionDataMap = Record<string, string>;

export function asSectionData(value: unknown): SectionDataMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const out: SectionDataMap = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "string" && raw.trim()) {
      out[key] = raw.trim();
    }
  }
  return out;
}

export function sectionField(
  legalCase: Pick<LegalCase, "sectionData">,
  key: string,
): string {
  return asSectionData(legalCase.sectionData)[key] ?? "";
}

export function parseAmount(value: string): number {
  const cleaned = value.replace(/[^\d.-]/g, "");
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

export function hasSectionField(
  legalCase: Pick<LegalCase, "sectionData">,
  key: string,
): boolean {
  return Boolean(sectionField(legalCase, key));
}

export function sectionFieldMatches(
  legalCase: Pick<LegalCase, "sectionData">,
  key: string,
  pattern: RegExp,
): boolean {
  return pattern.test(sectionField(legalCase, key));
}
