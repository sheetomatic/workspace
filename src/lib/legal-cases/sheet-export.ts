import type { LegalCase } from "@prisma/client";
import { asSectionData } from "@/lib/legal-cases/section-data";

const HEADER_VALUE_GETTERS: Record<string, (legalCase: LegalCase) => string> = {
  "FILE NO.": (legalCase) => legalCase.fileNumber,
  "MCC NO": (legalCase) => legalCase.mccNumber ?? "",
  APPLICANT: (legalCase) => legalCase.applicant ?? "",
  "NON APPLICANT": (legalCase) => legalCase.nonApplicant ?? "",
  "CASE CATEGORY": (legalCase) => legalCase.category ?? "",
  "CASE STAGE": (legalCase) => legalCase.caseStage ?? "",
  "FILE STATUS": (legalCase) => legalCase.fileStatus ?? "",
  COURT: (legalCase) => legalCase.court ?? "",
  COMPANY: (legalCase) => legalCase.company ?? "",
  "CO. ADVOCATE": (legalCase) => legalCase.coAdvocate ?? "",
  "PREV DATE": (legalCase) => legalCase.prevDate ?? "",
  "NEXT DATE": (legalCase) => legalCase.nextDate ?? "",
  "REMARK (REQUIREMENTS)/ PROPOSALS": (legalCase) => legalCase.remarks ?? "",
  "AMD & CC STATUS": (legalCase) => legalCase.amdCcStatus ?? "",
  "F-NO": (legalCase) => legalCase.fNo ?? "",
  "SIGNING DATE": (legalCase) => legalCase.signingDate ?? "",
  "CASE FILED": (legalCase) => legalCase.caseFiled ?? "",
  "CLIENT ADVANCE": (legalCase) => legalCase.clientAdvance ?? "",
};

export const LEGAL_CASES_SHEET_HEADERS = [
  "FILE NO.",
  "MCC NO",
  "APPLICANT",
  "NON APPLICANT",
  "CASE CATEGORY",
  "CASE STAGE",
  "FILE STATUS",
  "COURT",
  "COMPANY",
  "CO. ADVOCATE",
  "PREV DATE",
  "NEXT DATE",
  "REMARK (REQUIREMENTS)/ PROPOSALS",
  "AMD & CC STATUS",
  "F-NO",
  "PERSON RESPONSIBLE",
  "",
  "PERSON RESPONSIBLE",
  "PERSON RESPONSIBLE",
  "PERSON RESPONSIBLE",
  "PERSON RESPONSIBLE",
  "PERSON RESPONSIBLE",
  "PERSON RESPONSIBLE",
] as const;

function personResponsibleColumnIndexes(header: string[]) {
  return header
    .map((item, index) => (item.trim() === "PERSON RESPONSIBLE" ? index : -1))
    .filter((index) => index >= 0);
}

export function legalCasesToSheetRows(
  header: string[],
  cases: LegalCase[],
): string[][] {
  const personResponsibleCols = personResponsibleColumnIndexes(header);
  const responsibleValues = [
    (legalCase: LegalCase) => legalCase.s2Responsible ?? "",
    (legalCase: LegalCase) => legalCase.s3Responsible ?? "",
    (legalCase: LegalCase) => legalCase.s4Responsible ?? "",
    (legalCase: LegalCase) => legalCase.s5Responsible ?? "",
    (legalCase: LegalCase) => legalCase.s6Responsible ?? "",
    (legalCase: LegalCase) => legalCase.s7Responsible ?? "",
  ];

  return cases.map((legalCase) => {
    const row = new Array(Math.max(header.length, 1)).fill("");

    header.forEach((name, index) => {
      const trimmed = name.trim();
      const getter = HEADER_VALUE_GETTERS[trimmed];
      if (getter) {
        row[index] = getter(legalCase);
        return;
      }
      row[index] = asSectionData(legalCase.sectionData)[trimmed] ?? "";
    });

    responsibleValues.forEach((getter, index) => {
      const columnIndex =
        index === 0
          ? personResponsibleCols[0]
          : personResponsibleCols[index + 1];
      if (columnIndex !== undefined && columnIndex >= 0) {
        row[columnIndex] = getter(legalCase);
      }
    });

    return row;
  });
}

export function defaultLegalCasesSheetHeader() {
  return [...LEGAL_CASES_SHEET_HEADERS];
}
