import type { LegalCase } from "@prisma/client";
import { fileCoverFromLegalCase } from "@/lib/legal-cases/file-cover";
import { daysSinceDateLabel } from "@/lib/legal-cases/intake-fields";

export const SIGNING_FILING_ALERT_DAYS = 30;
export const CLIENT_CALL_ALERT_DAYS = 30;

function isCaseFiled(caseFiled: string | null | undefined) {
  const value = (caseFiled ?? "").trim().toUpperCase();
  if (!value) {
    return false;
  }
  return !["NO", "N", "PENDING", "—", "-"].includes(value);
}

export function signingFilingGapDays(
  legalCase: Pick<LegalCase, "signingDate" | "caseFiled">,
): number | null {
  if (isCaseFiled(legalCase.caseFiled)) {
    return null;
  }
  return daysSinceDateLabel(legalCase.signingDate);
}

export function needsSigningFilingAlert(
  legalCase: Pick<LegalCase, "signingDate" | "caseFiled">,
): boolean {
  const days = signingFilingGapDays(legalCase);
  return days !== null && days > SIGNING_FILING_ALERT_DAYS;
}

export function lastClientCallDate(
  legalCase: Pick<LegalCase, "sectionData" | "coAdvocate">,
): string {
  const cover = fileCoverFromLegalCase(legalCase);
  let best = "";
  let bestAge: number | null = null;

  for (const row of cover.calledClientLog) {
    const date = row.date.trim();
    if (!date) {
      continue;
    }
    const age = daysSinceDateLabel(date);
    if (age === null) {
      continue;
    }
    if (bestAge === null || age < bestAge) {
      bestAge = age;
      best = date;
    }
  }

  return best;
}

export function clientCallStaleDays(
  legalCase: Pick<LegalCase, "sectionData" | "coAdvocate">,
): number | null {
  const last = lastClientCallDate(legalCase);
  if (!last) {
    return null;
  }
  return daysSinceDateLabel(last);
}

export function needsClientCallAlert(
  legalCase: Pick<LegalCase, "sectionData" | "coAdvocate">,
): boolean {
  const days = clientCallStaleDays(legalCase);
  return days !== null && days > CLIENT_CALL_ALERT_DAYS;
}
